import debounce from 'lodash.debounce';
import shallowEqual from 'shallowequal';

import { ListenerCollection } from '../../shared/listener-collection';
import {
  PortFinder,
  PortRPC,
  isMessage,
  isMessageEqual,
} from '../../shared/messaging';
import { isReply, isPublic } from '../helpers/annotation-metadata';
import { annotationMatchesSegment } from '../helpers/annotation-segment';
import { watch } from '../util/watch';

import type { Message } from '../../shared/messaging';
import type {
  AnnotationData,
  DocumentMetadata,
  SegmentInfo,
} from '../../types/annotator';
import type { Annotation } from '../../types/api';
import type {
  SidebarToHostEvent,
  HostToSidebarEvent,
  SidebarToGuestEvent,
  GuestToSidebarEvent,
} from '../../types/port-rpc-events';
import type { SidebarStore } from '../store';
import type { Frame } from '../store/modules/frames';
import type { AnnotationsService } from './annotations';

type DocumentInfo = {
  uri: string;
  metadata: DocumentMetadata;
  segmentInfo?: SegmentInfo;
};

/**
 * Return a minimal representation of an annotation that can be sent from the
 * sidebar app to a guest frame.
 *
 * Because this representation will be exposed to untrusted third-party
 * JavaScript, it includes only the information needed to uniquely identify it
 * within the current session and anchor it in the document.
 */
export function formatAnnot({
  $cluster,
  $tag,
  target,
  uri,
}: Annotation): AnnotationData {
  return {
    $cluster,
    $tag,
    target,
    uri,
  };
}

/**
 * Return the frame which best matches an annotation.
 */
function frameForAnnotation(frames: Frame[], ann: Annotation): Frame | null {
  // Choose frame with an exact URL match if possible. In the unlikely situation
  // where multiple frames have the same URL, we'll use whichever connected first.
  const uriMatch = frames.find(f => f.uri === ann.uri);
  if (uriMatch) {
    return uriMatch;
  }

  // If there is no exact URL match, choose the main/host frame for consistent results.
  const mainFrame = frames.find(f => f.id === null);
  if (mainFrame) {
    return mainFrame;
  }

  // If there is no main frame (eg. in VitalSource), fall back to whichever
  // frame connected first.
  return frames[0] ?? null;
}

/**
 * Service that synchronizes annotations between the sidebar and host page.
 *
 * Annotations are synced in both directions. New annotations created in the host
 * page are added to the store in the sidebar and persisted to the backend. Annotations
 * fetched from the API and added to the sidebar's store are sent to the host
 * page in order to create highlights in the document. When an annotation is
 * deleted in the sidebar it is removed from the host page.
 *
 * This service also synchronizes the selection and focus states of annotations,
 * so that clicking a highlight in the page filters the selection in the sidebar
 * and hovering an annotation in the sidebar highlights the corresponding
 * highlights in the page.
 *
 * For annotations sent from the sidebar to host page, only the subset of annotation
 * data needed to create the highlights is sent. This is a security/privacy
 * feature to prevent the host page observing the contents or authors of annotations.
 *
 * @inject
 */
export class FrameSyncService {
  private _annotationsService: AnnotationsService;

  /**
   * Map of guest frame ID to channel for communicating with guest.
   *
   * The ID will be `null` for the "main" guest, which is usually the one in
   * the host frame.
   */
  private _guestRPC: Map<
    string | null,
    PortRPC<GuestToSidebarEvent, SidebarToGuestEvent>
  >;

  /** Whether highlights are visible in guest frames. */
  private _highlightsVisible: boolean;

  /**
   * Channel for sidebar-host communication.
   */
  private _hostRPC: PortRPC<HostToSidebarEvent, SidebarToHostEvent>;

  /**
   * Tags of annotations that are currently loaded into guest frames.
   */
  private _inFrame: Set<string>;

  private _listeners: ListenerCollection;
  private _portFinder: PortFinder;
  private _store: SidebarStore;

  /**
   * ID of an annotation that should be scrolled to after anchoring completes.
   *
   * This is set when {@link scrollToAnnotation} is called and the document
   * needs to be navigated to a different URL. This can happen in EPUBs.
   *
   * We store an ID rather than a tag because the navigation currently triggers
   * a reload of annotations, which will change their tags but not their IDs.
   */
  private _pendingScrollToId: string | null;

  // Test seam
  private _window: Window;

  constructor(
    $window: Window,
    annotationsService: AnnotationsService,
    store: SidebarStore
  ) {
    this._window = $window;
    this._annotationsService = annotationsService;
    this._store = store;
    this._portFinder = new PortFinder({
      hostFrame: this._window.parent,
      source: 'sidebar',
    });
    this._listeners = new ListenerCollection();

    this._hostRPC = new PortRPC();
    this._guestRPC = new Map();
    this._inFrame = new Set<string>();
    this._highlightsVisible = false;
    this._pendingScrollToId = null;

    this._setupSyncToGuests();
    this._setupHostEvents();
    this._setupFeatureFlagSync();
  }

  /**
   * Watch for changes to the set of annotations loaded in the sidebar and
   * notify connected guests about new/updated/deleted annotations.
   */
  _setupSyncToGuests() {
    let prevPublicAnns = 0;

    /**
     * Handle annotations or frames being added or removed in the store.
     */
    const onStoreAnnotationsChanged = (
      annotations: Annotation[],
      frames: Frame[],
      prevAnnotations: Annotation[]
    ) => {
      let publicAnns = 0;
      const inSidebar = new Set<string>();
      const added = [] as Annotation[];

      // Determine which annotations have been added or deleted in the sidebar.
      annotations.forEach(annot => {
        if (isReply(annot)) {
          // The frame does not need to know about replies
          return;
        }

        if (isPublic(annot)) {
          ++publicAnns;
        }

        inSidebar.add(annot.$tag);
        if (!this._inFrame.has(annot.$tag)) {
          added.push(annot);
        }
      });
      const deleted = prevAnnotations.filter(
        annot => !inSidebar.has(annot.$tag)
      );

      // Send added annotations to matching frame.
      if (added.length > 0) {
        const addedByFrame = new Map<string | null, Annotation[]>();

        for (const annotation of added) {
          const frame = frameForAnnotation(frames, annotation);
          if (
            !frame ||
            (frame.segment &&
              !annotationMatchesSegment(annotation, frame.segment))
          ) {
            continue;
          }
          const anns = addedByFrame.get(frame.id) ?? [];
          anns.push(annotation);
          addedByFrame.set(frame.id, anns);
        }

        for (const [frameId, anns] of addedByFrame) {
          const rpc = this._guestRPC.get(frameId);
          if (rpc) {
            rpc.call('loadAnnotations', anns.map(formatAnnot));
          }
        }

        added.forEach(annot => {
          this._inFrame.add(annot.$tag);
        });
      }

      // Remove deleted annotations from frames.
      deleted.forEach(annot => {
        // Delete from all frames. If a guest is not displaying a particular
        // annotation, it will just ignore the request.
        this._guestRPC.forEach(rpc => rpc.call('deleteAnnotation', annot.$tag));
        this._inFrame.delete(annot.$tag);
      });

      // Update elements in host page which display annotation counts.
      if (frames.length > 0) {
        if (frames.every(frame => frame.isAnnotationFetchComplete)) {
          if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
            this._hostRPC.call('publicAnnotationCountChanged', publicAnns);
            prevPublicAnns = publicAnns;
          }
        }
      }
    };

    watch(
      this._store.subscribe,
      () => [this._store.allAnnotations(), this._store.frames()] as const,
      ([annotations, frames], [prevAnnotations]) =>
        onStoreAnnotationsChanged(annotations, frames, prevAnnotations),
      shallowEqual
    );

    watch(
      this._store.subscribe,
      () => this._store.getContentInfo(),
      contentInfo => {
        // We send the content info to all guests, even though it is only needed
        // by the main one. See notes in `_connectGuest`.
        this._guestRPC.forEach(guest => {
          guest.call('showContentInfo', contentInfo);
        });
      }
    );
  }

  /**
   * Set up a connection to a new guest frame.
   *
   * @param port - Port for communicating with the guest
   * @param sourceId - Identifier for the guest frame
   */
  _connectGuest(port: MessagePort, sourceId: string | null) {
    const guestRPC = new PortRPC<GuestToSidebarEvent, SidebarToGuestEvent>();

    this._guestRPC.set(sourceId, guestRPC);

    // Update document metadata for this guest. The guest will call this method
    // immediately after it connects to the sidebar. It may call it again
    // later if the document in the guest frame is navigated.
    guestRPC.on('documentInfoChanged', (info: DocumentInfo) => {
      this._store.connectFrame({
        id: sourceId,
        metadata: info.metadata,
        uri: info.uri,
        segment: info.segmentInfo,
      });
    });

    // TODO - Close connection if we don't receive a "connect" message within
    // a certain time frame.

    guestRPC.on('close', () => {
      const frame = this._store.frames().find(f => f.id === sourceId);
      if (frame) {
        this._store.destroyFrame(frame);
      }
      guestRPC.destroy();
      this._guestRPC.delete(sourceId);
    });

    // A new annotation, note or highlight was created in the frame
    guestRPC.on('createAnnotation', (annot: AnnotationData) => {
      // If user is not logged in, we can't really create a meaningful highlight
      // or annotation. Instead, we need to open the sidebar, show an error,
      // and delete the (unsaved) annotation so it gets un-selected in the
      // target document
      if (!this._store.isLoggedIn()) {
        this._hostRPC.call('openSidebar');
        this._store.openSidebarPanel('loginPrompt');
        this._guestRPC.forEach(rpc => rpc.call('deleteAnnotation', annot.$tag));
        return;
      }
      this._inFrame.add(annot.$tag);

      // Open the sidebar so that the user can immediately edit the draft
      // annotation.
      if (!annot.$highlight) {
        this._hostRPC.call('openSidebar');
      }

      // Ensure that the highlight for the newly-created annotation is visible.
      // Currently we only support a single, shared visibility state for all highlights
      // in all frames, so this will make all existing highlights visible too.
      this._hostRPC.call('showHighlights');

      // Create the new annotation in the sidebar.
      this._annotationsService.create(annot);
    });

    // Map of annotation tag to anchoring status
    // ('anchored'|'orphan'|'timeout').
    //
    // Updates are coalesced to reduce the overhead from processing
    // triggered by each `UPDATE_ANCHOR_STATUS` action that is dispatched.

    let anchoringStatusUpdates: Record<
      string,
      'anchored' | 'orphan' | 'timeout'
    > = {};
    const scheduleAnchoringStatusUpdate = debounce(() => {
      this._store.updateAnchorStatus(anchoringStatusUpdates);
      anchoringStatusUpdates = {};
    }, 10);

    // Anchoring an annotation in the frame completed
    guestRPC.on('syncAnchoringStatus', ({ $tag, $orphan }: AnnotationData) => {
      this._inFrame.add($tag);
      anchoringStatusUpdates[$tag] = $orphan ? 'orphan' : 'anchored';
      scheduleAnchoringStatusUpdate();

      if (this._pendingScrollToId) {
        const [id] = this._store.findIDsForTags([$tag]);
        if (id === this._pendingScrollToId) {
          this._pendingScrollToId = null;
          guestRPC.call('scrollToAnnotation', $tag);
        }
      }
    });

    guestRPC.on(
      'showAnnotations',
      (tags: string[], focusFirstInSelection = false) => {
        // Since annotations are selected by ID rather than tag, this logic
        // currently only supports saved annotations.
        const ids = this._store.findIDsForTags(tags);
        this._store.selectAnnotations(ids);
        this._store.selectTab('annotation');

        // Attempt to transfer keyboard focus to the first selected annotation.
        //
        // To do this we need to focus both the annotation card and the frame
        // itself. It doesn't matter in which order.
        if (ids.length > 0 && focusFirstInSelection) {
          // Request the annotation card to be focused. This is handled asynchronously.
          this._store.setAnnotationFocusRequest(ids[0]);

          // Focus the sidebar frame. This may fail in WebKit-based browsers
          // if the user has no interacted with the frame since it loaded.
          window.focus();
        }
      }
    );

    guestRPC.on('hoverAnnotations', (tags: string[]) => {
      this._store.hoverAnnotations(tags || []);
    });

    guestRPC.on('toggleAnnotationSelection', (tags: string[]) => {
      this._store.toggleSelectedAnnotations(this._store.findIDsForTags(tags));
    });

    guestRPC.on('openSidebar', () => {
      this._hostRPC.call('openSidebar');
    });

    guestRPC.on('closeSidebar', () => {
      this._hostRPC.call('closeSidebar');
    });

    guestRPC.connect(port);

    // Synchronize highlight visibility in this guest with the sidebar's controls.
    guestRPC.call('setHighlightsVisible', this._highlightsVisible);
    guestRPC.call('featureFlagsUpdated', this._store.profile().features);

    // If we have content banner data, send it to the guest. If there are
    // multiple guests the banner is likely only appropriate for the main one.
    // Current contexts that use the banner only have one guest, so we can get
    // the data to the guest faster by sending it immediately, rather than
    // waiting for the `documentInfoChanged` event to tell us which is the main
    // guest.
    const contentInfo = this._store.getContentInfo();
    if (contentInfo) {
      guestRPC.call('showContentInfo', contentInfo);
    }
  }

  /**
   * Listen for messages coming from the host frame.
   */
  _setupHostEvents() {
    this._hostRPC.on('sidebarOpened', () => {
      this._store.setSidebarOpened(true);
    });

    // When user toggles the highlight visibility control in the sidebar container,
    // update the visibility in all the guest frames.
    this._hostRPC.on('setHighlightsVisible', (visible: boolean) => {
      this._highlightsVisible = visible;
      this._guestRPC.forEach(rpc => rpc.call('setHighlightsVisible', visible));
    });
  }

  /**
   * Set up synchronization of feature flags to host and guest frames.
   */
  _setupFeatureFlagSync() {
    const getFlags = () => this._store.profile().features;

    const sendFlags = (flags: Record<string, boolean>) => {
      this._hostRPC.call('featureFlagsUpdated', flags);
      for (const guest of this._guestRPC.values()) {
        guest.call('featureFlagsUpdated', flags);
      }
    };

    // Send current flags to host when it connects, and any already-connected
    // guests.
    sendFlags(getFlags());

    // Watch for future flag changes.
    watch(this._store.subscribe, getFlags, sendFlags);
  }

  /**
   * Connect to the host frame and guest frame(s) in the current browser tab.
   */
  async connect() {
    // Create channel for sidebar-host communication.
    const hostPort = await this._portFinder.discover('host');
    this._hostRPC.connect(hostPort);

    // Listen for guests connecting to the sidebar.
    this._listeners.add(hostPort, 'message', event => {
      const { data, ports } = event;

      const message = data as Message | unknown;
      if (!isMessage(message)) {
        return;
      }

      if (
        isMessageEqual(message, {
          frame1: 'guest',
          frame2: 'sidebar',
          type: 'offer',
        })
      ) {
        this._connectGuest(ports[0], message.sourceId ?? null);
      }
    });
  }

  /**
   * Send an RPC message to the host frame.
   */
  notifyHost(method: SidebarToHostEvent, ...args: unknown[]) {
    this._hostRPC.call(method, ...args);
  }

  /**
   * Mark annotations as hovered.
   *
   * This is used to indicate the highlights in the document that correspond
   * to hovered annotations in the sidebar.
   *
   * @param tags - annotation $tags
   */
  hoverAnnotations(tags: string[]) {
    this._store.hoverAnnotations(tags);
    this._guestRPC.forEach(rpc => rpc.call('hoverAnnotations', tags));
  }

  /**
   * Scroll the frame to the highlight for an annotation.
   */
  scrollToAnnotation(ann: Annotation) {
    const frame = frameForAnnotation(this._store.frames(), ann);
    if (!frame) {
      return;
    }
    const guest = this._guestRPC.get(frame?.id);
    if (!guest) {
      return;
    }

    // If this annotation is for a different segment of a book than is loaded
    // in the guest, then ask the guest to navigate to the appropriate segment.
    //
    // In EPUBs, this will cause the guest to disconnect and a new guest will
    // connect when the new content has loaded. We will then need to wait for
    // the annotation to anchor in the new guest frame before we can actually
    // scroll to it.
    if (frame.segment && !annotationMatchesSegment(ann, frame.segment)) {
      if (ann.id) {
        // Schedule scroll once anchoring completes.
        this._pendingScrollToId = ann.id;
      }
      guest.call('navigateToSegment', formatAnnot(ann));
      return;
    }

    guest.call('scrollToAnnotation', ann.$tag);
  }

  // Only used to cleanup tests
  destroy() {
    this._portFinder.destroy();
    this._listeners.removeAll();
  }
}
