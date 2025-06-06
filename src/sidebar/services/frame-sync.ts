import type { ToastMessage } from '@hypothesis/frontend-shared';
import { ListenerCollection } from '@hypothesis/frontend-shared';
import debounce from 'lodash.debounce';
import type { DebouncedFunction } from 'lodash.debounce';
import shallowEqual from 'shallowequal';

import {
  PortFinder,
  PortRPC,
  isMessage,
  isMessageEqual,
} from '../../shared/messaging';
import type { Message } from '../../shared/messaging';
import type {
  AnnotationData,
  DocumentInfo,
  RenderToBitmapOptions,
} from '../../types/annotator';
import type { Annotation } from '../../types/api';
import type {
  SidebarToHostCalls,
  HostToSidebarCalls,
  SidebarToGuestCalls,
  GuestToSidebarCalls,
} from '../../types/port-rpc-calls';
import { isReply } from '../helpers/annotation-metadata';
import {
  annotationMatchesSegment,
  segmentMatchesFocusFilters,
} from '../helpers/annotation-segment';
import { isPrivate } from '../helpers/permissions';
import type { SidebarStore } from '../store';
import type { Frame } from '../store/modules/frames';
import { watch } from '../util/watch';
import type { AnnotationsService } from './annotations';
import type { ToastMessengerService } from './toast-messenger';

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
 * Service that handles communication between the sidebar and guest and host
 * frames.
 *
 * The service's main responsibility is to synchronize annotations between the
 * sidebar and guests. New annotations created in guest frames are added to the
 * store in the sidebar and persisted to the backend.  Annotations fetched from
 * the API and added to the sidebar's store are sent to the appropriate guest
 * to display highlights in the document.
 *
 * Only a minimal subset of annotation data is sent from the sidebar to guests.
 * This is a security/privacy feature to prevent guest frames (which often
 * contain third-party JavaScript) from observing the contents or authors of
 * annotations.
 *
 * In addition to annotation data, this service also handles:
 *
 *  - Synchronizing the selection and hover states of annotations between the
 *    sidebar and guest frames
 *  - Triggering scrolling or navigation of guest frames when an annotation is
 *    clicked in the sidebar
 *  - Sending feature flags to host and guest frames
 *  - Various other interactions with guest and host frames
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
    PortRPC<GuestToSidebarCalls, SidebarToGuestCalls>
  >;

  /** Whether highlights are visible in guest frames. */
  private _highlightsVisible: boolean;

  /**
   * Channel for sidebar-host communication.
   */
  private _hostRPC: PortRPC<HostToSidebarCalls, SidebarToHostCalls>;

  /**
   * Tags of annotations that are currently loaded into guest frames.
   */
  private _inFrame: Set<string>;

  private _listeners: ListenerCollection;
  private _portFinder: PortFinder;
  private _store: SidebarStore;
  private _toastMessenger: ToastMessengerService;

  /**
   * Tag of an annotation that should be scrolled to after anchoring completes.
   *
   * This is set when {@link scrollToAnnotation} is called and the document
   * needs to be navigated to a different URL. This can happen in EPUBs.
   */
  private _pendingScrollToTag: string | null;

  /**
   * Tag of an annotation that should be hovered after anchoring completes.
   *
   * See notes for {@link _pendingScrollToTag}.
   */
  private _pendingHoverTag: string | null;

  /**
   * Map of annotation tag to anchoring status. This holds status updates
   * which have been received from guest frames but not yet committed to the store.
   *
   * Commits are batched to reduce the reduce the overhead from re-rendering
   * etc. triggered by `SidebarStore.updateAnchorStatus` calls.
   */
  private _pendingAnchorStatusUpdates: Map<string, 'anchored' | 'orphan'>;

  /**
   * Schedule a commit of the anchoring status updates in
   * {@link _pendingAnchorStatusUpdates} to the store.
   */
  private _scheduleAnchorStatusUpdate: DebouncedFunction<[]>;

  /** Indicates if the sidebar is currently open or closed */
  private _sidebarIsOpen: boolean;

  // Test seam
  private _window: Window;

  constructor(
    $window: Window,
    annotationsService: AnnotationsService,
    store: SidebarStore,
    toastMessenger: ToastMessengerService,
  ) {
    this._window = $window;
    this._annotationsService = annotationsService;
    this._store = store;
    this._toastMessenger = toastMessenger;
    this._portFinder = new PortFinder({
      hostFrame: this._window.parent,
      source: 'sidebar',
    });
    this._listeners = new ListenerCollection();

    this._hostRPC = new PortRPC();
    this._guestRPC = new Map();
    this._inFrame = new Set<string>();
    this._highlightsVisible = false;

    this._pendingScrollToTag = null;
    this._pendingHoverTag = null;
    this._pendingAnchorStatusUpdates = new Map();

    this._scheduleAnchorStatusUpdate = debounce(() => {
      const records = Object.fromEntries(
        this._pendingAnchorStatusUpdates.entries(),
      );
      this._store.updateAnchorStatus(records);
      this._pendingAnchorStatusUpdates.clear();
    }, 10);

    this._sidebarIsOpen = false;

    this._setupSyncToGuests();
    this._setupHostEvents();
    this._setupFeatureFlagSync();
    this._setupToastMessengerEvents();
  }

  /**
   * Watch for changes to the set of annotations loaded in the sidebar and
   * notify connected guests about new/updated/deleted annotations.
   */
  private _setupSyncToGuests() {
    let prevPublicAnns = 0;

    /**
     * Handle annotations or frames being added or removed in the store.
     */
    const onStoreAnnotationsChanged = (
      annotations: Annotation[],
      frames: Frame[],
      prevAnnotations: Annotation[],
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

        if (!isPrivate(annot.permissions)) {
          ++publicAnns;
        }

        inSidebar.add(annot.$tag);
        if (!this._inFrame.has(annot.$tag)) {
          added.push(annot);
        }
      });
      const deleted = prevAnnotations.filter(
        annot => !inSidebar.has(annot.$tag),
      );

      // Send added annotations to matching frame.
      if (added.length > 0) {
        const addedByFrame = new Map<string | null, Annotation[]>();

        // List of annotations to immediately mark as anchored, as opposed to
        // waiting for the guest to report the status. This is used for
        // annotations associated with content that is different from what is
        // currently loaded in the guest frame (eg. different EPUB chapter).
        //
        // For these annotations, we optimistically assume they will anchor
        // when the appropriate content is loaded.
        const anchorImmediately = [];

        for (const annotation of added) {
          const frame = frameForAnnotation(frames, annotation);
          if (
            !frame ||
            (frame.segment &&
              !annotationMatchesSegment(annotation, frame.segment))
          ) {
            anchorImmediately.push(annotation.$tag);
            continue;
          }
          const anns = addedByFrame.get(frame.id) ?? [];
          anns.push(annotation);
          addedByFrame.set(frame.id, anns);
        }

        if (anchorImmediately.length > 0) {
          this._updateAnchorStatus(anchorImmediately, 'anchored');
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
      shallowEqual,
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
      },
    );
  }

  /**
   * Schedule an update of the anchoring status of annotation(s) in the store.
   */
  private _updateAnchorStatus(
    tag: string | string[],
    state: 'orphan' | 'anchored',
  ) {
    const tags = Array.isArray(tag) ? tag : [tag];
    for (const tag of tags) {
      this._pendingAnchorStatusUpdates.set(tag, state);
    }
    this._scheduleAnchorStatusUpdate();
  }

  /**
   * Set up a connection to a new guest frame.
   *
   * @param port - Port for communicating with the guest
   * @param sourceId - Identifier for the guest frame
   */
  private _connectGuest(port: MessagePort, sourceId: string | null) {
    const guestRPC = new PortRPC<GuestToSidebarCalls, SidebarToGuestCalls>();

    this._guestRPC.set(sourceId, guestRPC);

    // Update document metadata for this guest. The guest will call this method
    // immediately after it connects to the sidebar. It may call it again
    // later if the document in the guest frame is navigated.
    guestRPC.on('documentInfoChanged', (info: DocumentInfo) => {
      const focusFilters = this._store.getFocusFilters();

      // If we are in a classroom assignment with an associated page range,
      // tell the user if they have navigated outside that range.
      if (info.segmentInfo && Object.keys(focusFilters).length > 0) {
        const match = segmentMatchesFocusFilters(
          info.segmentInfo,
          focusFilters,
        );
        guestRPC.call('setOutsideAssignmentNoticeVisible', !match);
      }

      this._store.connectFrame({
        id: sourceId,
        metadata: info.metadata,
        uri: info.uri,
        segment: info.segmentInfo,
        persistent: info.persistent,
      });
    });

    // TODO - Close connection if we don't receive a "connect" message within
    // a certain time frame.

    guestRPC.on('close', () => {
      const frame = this._store.frames().find(f => f.id === sourceId);
      if (frame && !frame.persistent) {
        this._store.destroyFrame(frame);
      }

      // Mark annotations as no longer being loaded in the guest, even if
      // the frame was marked as `persistent`. In that case if a new guest
      // connects with the same ID as the one that just went away, we'll send
      // the already-loaded annotations to the new guest.
      this._inFrame.clear();

      guestRPC.destroy();
      this._guestRPC.delete(sourceId);
    });

    // A new annotation, note or highlight was created in the frame
    guestRPC.on('createAnnotation', (annot: AnnotationData) => {
      // If user is not logged in, or groups haven't loaded yet, we can't create
      // a meaningful highlight or annotation. Instead, we need to open the
      // sidebar, show an error, and delete the (unsaved) annotation so it gets
      // un-selected in the target document
      const isLoggedIn = this._store.isLoggedIn();
      const hasGroup = this._store.focusedGroup() !== null;

      if (!isLoggedIn || !hasGroup) {
        this._hostRPC.call('openSidebar');
        if (!isLoggedIn) {
          this._store.openSidebarPanel('loginPrompt');
        }
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

    // Anchoring an annotation in the frame completed
    guestRPC.on('syncAnchoringStatus', ({ $tag, $orphan }: AnnotationData) => {
      this._inFrame.add($tag);
      this._updateAnchorStatus($tag, $orphan ? 'orphan' : 'anchored');

      if ($tag === this._pendingHoverTag) {
        this._pendingHoverTag = null;
        guestRPC.call('hoverAnnotations', [$tag]);
      }
      if (this._pendingScrollToTag) {
        if ($tag === this._pendingScrollToTag) {
          this._pendingScrollToTag = null;
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
      },
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
    guestRPC.call('featureFlagsUpdated', this._store.features());

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
  private _setupHostEvents() {
    this._hostRPC.on('sidebarOpened', () => {
      this._sidebarIsOpen = true;
      this._store.setSidebarOpened(true);
    });
    this._hostRPC.on('sidebarClosed', () => {
      this._sidebarIsOpen = false;
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
  private _setupFeatureFlagSync() {
    const getFlags = () => this._store.features();

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

  private _setupToastMessengerEvents() {
    this._toastMessenger.on('toastMessageAdded', (message: ToastMessage) => {
      // Forward hidden messages to "host" when sidebar is collapsed, with the
      // intention that another container can be used to render those messages
      // there, ensuring screen readers announce them.
      if (message.visuallyHidden && !this._sidebarIsOpen) {
        this.notifyHost('toastMessageAdded', message);
      }
    });
    this._toastMessenger.on('toastMessageDismissed', (messageId: string) => {
      this.notifyHost('toastMessageDismissed', messageId);
    });
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
  notifyHost<M extends keyof SidebarToHostCalls>(
    method: M,
    ...args: Parameters<SidebarToHostCalls[M]>
  ) {
    this._hostRPC.call(method, ...args);
  }

  /**
   * Mark annotation as hovered.
   *
   * This is used to indicate the highlights in the document that correspond
   * to a hovered annotation in the sidebar.
   *
   * This function only accepts a single annotation because the user can only
   * hover one annotation card in the sidebar at a time. Hover updates in the
   * other direction (guest to sidebar) support multiple annotations since a
   * user can hover multiple highlights in the document at once.
   */
  hoverAnnotation(ann: Annotation | null) {
    this._pendingHoverTag = null;

    const tags = ann ? [ann.$tag] : [];
    this._store.hoverAnnotations(tags);

    if (!ann) {
      this._guestRPC.forEach(rpc => rpc.call('hoverAnnotations', []));
      return;
    }

    // If annotation is not currently anchored in a guest, schedule hover for
    // when annotation is anchored. This can happen if an annotation is for a
    // different chapter of an EPUB than the currently loaded one. See notes in
    // `scrollToAnnotation`.
    const frame = frameForAnnotation(this._store.frames(), ann);
    if (
      !frame ||
      (frame.segment && !annotationMatchesSegment(ann, frame.segment))
    ) {
      this._pendingHoverTag = ann.$tag;
      return;
    }
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
      // Schedule scroll once anchoring completes.
      this._pendingScrollToTag = ann.$tag;
      guest.call('navigateToSegment', formatAnnot(ann));
      return;
    }

    guest.call('scrollToAnnotation', ann.$tag);
  }

  /**
   * Request a thumbnail from an annotated region of the document.
   *
   * @param tag - Annotation identifier. See {@link Annotation.$tag}.
   */
  async requestThumbnail(
    tag: string,
    options: RenderToBitmapOptions = {},
  ): Promise<ImageBitmap> {
    // Get the guest for the main frame. This assumes that the annotation is
    // anchored in the main frame.
    const guest = this._guestRPC.get(null);
    if (!guest) {
      throw new Error('No guest connected');
    }

    return new Promise((resolve, reject) => {
      guest.call('renderThumbnail', tag, options, result => {
        if (result.ok) {
          resolve(result.value);
        } else {
          reject(new Error(result.error));
        }
      });
    });
  }

  // Only used to cleanup tests
  destroy() {
    this._portFinder.destroy();
    this._listeners.removeAll();
  }
}
