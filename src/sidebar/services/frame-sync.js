import debounce from 'lodash.debounce';
import shallowEqual from 'shallowequal';

import { ListenerCollection } from '../../shared/listener-collection';
import { PortFinder, PortRPC, isMessageEqual } from '../../shared/messaging';
import { isReply, isPublic } from '../helpers/annotation-metadata';
import { watch } from '../util/watch';

/**
 * @typedef {import('../../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/port-rpc-events').SidebarToHostEvent} SidebarToHostEvent
 * @typedef {import('../../types/port-rpc-events').HostToSidebarEvent} HostToSidebarEvent
 * @typedef {import('../../types/port-rpc-events').SidebarToGuestEvent} SidebarToGuestEvent
 * @typedef {import('../../types/port-rpc-events').GuestToSidebarEvent} GuestToSidebarEvent
 * @typedef {import('../store/modules/frames').Frame} Frame
 */

/**
 * Return a minimal representation of an annotation that can be sent from the
 * sidebar app to a guest frame.
 *
 * Because this representation will be exposed to untrusted third-party
 * JavaScript, it includes only the information needed to uniquely identify it
 * within the current session and anchor it in the document.
 *
 * @param {Annotation} annotation
 * @returns {AnnotationData}
 */
export function formatAnnot({ $tag, target, uri }) {
  return {
    $tag,
    target,
    uri,
  };
}

/**
 * Return the frame which best matches an annotation.
 *
 * @param {Frame[]} frames
 * @param {Annotation} ann
 */
function frameForAnnotation(frames, ann) {
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
  return frames[0];
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
  /**
   * @param {Window} $window - Test seam
   * @param {import('./annotations').AnnotationsService} annotationsService
   * @param {import('../store').SidebarStore} store
   */
  constructor($window, annotationsService, store) {
    this._window = $window;
    this._annotationsService = annotationsService;
    this._store = store;
    this._portFinder = new PortFinder({
      hostFrame: this._window.parent,
      source: 'sidebar',
    });
    this._listeners = new ListenerCollection();

    /**
     * Channel for sidebar-host communication.
     *
     * @type {PortRPC<HostToSidebarEvent, SidebarToHostEvent>}
     */
    this._hostRPC = new PortRPC();

    /**
     * Map of guest frame ID to channel for communicating with guest.
     *
     * The ID will be `null` for the "main" guest, which is usually the one in
     * the host frame.
     *
     * @type {Map<string|null, PortRPC<GuestToSidebarEvent, SidebarToGuestEvent>>}
     */
    this._guestRPC = new Map();
    this._nextGuestId = 0;

    /**
     * Tags of annotations that are currently loaded into guest frames.
     *
     * @type {Set<string>}
     */
    this._inFrame = new Set();

    /** Whether highlights are visible in guest frames. */
    this._highlightsVisible = false;

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
     *
     * @param {Annotation[]} annotations
     * @param {Frame[]} frames
     * @param {Annotation[]} prevAnnotations
     */
    const onStoreAnnotationsChanged = (
      annotations,
      frames,
      prevAnnotations
    ) => {
      let publicAnns = 0;
      /** @type {Set<string>} */
      const inSidebar = new Set();
      /** @type {Annotation[]} */
      const added = [];

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
        /** @type {Map<string|null, Annotation[]>} */
        const addedByFrame = new Map();
        for (let annotation of added) {
          const frame = frameForAnnotation(frames, annotation);
          if (!frame) {
            continue;
          }
          const anns = addedByFrame.get(frame.id) ?? [];
          anns.push(annotation);
          addedByFrame.set(frame.id, anns);
        }

        for (let [frameId, anns] of addedByFrame) {
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
      () =>
        /** @type {const} */ ([
          this._store.allAnnotations(),
          this._store.frames(),
        ]),
      ([annotations, frames], [prevAnnotations]) =>
        onStoreAnnotationsChanged(annotations, frames, prevAnnotations),
      shallowEqual
    );
  }

  /**
   * Set up a connection to a new guest frame.
   *
   * @param {MessagePort} port - Port for communicating with the guest
   */
  _connectGuest(port) {
    /** @type {PortRPC<GuestToSidebarEvent, SidebarToGuestEvent>} */
    const guestRPC = new PortRPC();

    // Add guest RPC to map with a temporary ID until we learn the real ID.
    //
    // We need to add the guest to the map immediately so that any notifications
    // sent from this service to all guests, before we learn the real frame ID,
    // are sent to this new guest.
    ++this._nextGuestId;
    let frameIdentifier = /** @type {string|null} */ (
      `temp-${this._nextGuestId}`
    );
    this._guestRPC.set(frameIdentifier, guestRPC);

    // Update document metadata for this guest. We currently assume that the
    // guest will make this call once after it connects. To handle updates
    // to the document, we'll need to change `connectFrame` to update rather than
    // add to the frame list.
    guestRPC.on('documentInfoChanged', info => {
      this._guestRPC.delete(frameIdentifier);

      frameIdentifier = info.frameIdentifier;
      this._guestRPC.set(frameIdentifier, guestRPC);

      this._store.connectFrame({
        id: info.frameIdentifier,
        metadata: info.metadata,
        uri: info.uri,
      });
    });

    // TODO - Close connection if we don't receive a "connect" message within
    // a certain time frame.

    guestRPC.on('close', () => {
      const frame = this._store.frames().find(f => f.id === frameIdentifier);
      if (frame) {
        this._store.destroyFrame(frame);
      }
      guestRPC.destroy();
      this._guestRPC.delete(frameIdentifier);
    });

    // A new annotation, note or highlight was created in the frame
    guestRPC.on(
      'createAnnotation',
      /** @param {AnnotationData} annot */
      annot => {
        // If user is not logged in, we can't really create a meaningful highlight
        // or annotation. Instead, we need to open the sidebar, show an error,
        // and delete the (unsaved) annotation so it gets un-selected in the
        // target document
        if (!this._store.isLoggedIn()) {
          this._hostRPC.call('openSidebar');
          this._store.openSidebarPanel('loginPrompt');
          this._guestRPC.forEach(rpc =>
            rpc.call('deleteAnnotation', annot.$tag)
          );
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
      }
    );

    // Map of annotation tag to anchoring status
    // ('anchored'|'orphan'|'timeout').
    //
    // Updates are coalesced to reduce the overhead from processing
    // triggered by each `UPDATE_ANCHOR_STATUS` action that is dispatched.

    /** @type {Record<string,'anchored'|'orphan'|'timeout'>} */
    let anchoringStatusUpdates = {};
    const scheduleAnchoringStatusUpdate = debounce(() => {
      this._store.updateAnchorStatus(anchoringStatusUpdates);
      anchoringStatusUpdates = {};
    }, 10);

    // Anchoring an annotation in the frame completed
    guestRPC.on(
      'syncAnchoringStatus',
      /** @param {AnnotationData} annotation */
      ({ $tag, $orphan }) => {
        this._inFrame.add($tag);
        anchoringStatusUpdates[$tag] = $orphan ? 'orphan' : 'anchored';
        scheduleAnchoringStatusUpdate();
      }
    );

    guestRPC.on('showAnnotations', tags => {
      this._store.selectAnnotations(this._store.findIDsForTags(tags));
      this._store.selectTab('annotation');
    });

    guestRPC.on('focusAnnotations', tags => {
      this._store.focusAnnotations(tags || []);
    });

    guestRPC.on('toggleAnnotationSelection', tags => {
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
    this._hostRPC.on('setHighlightsVisible', visible => {
      this._highlightsVisible = visible;
      this._guestRPC.forEach(rpc => rpc.call('setHighlightsVisible', visible));
    });
  }

  /**
   * Set up synchronization of feature flags to host and guest frames.
   */
  _setupFeatureFlagSync() {
    const getFlags = () => this._store.profile().features;

    /** @param {Record<string, boolean>} flags */
    const sendFlags = flags => {
      this._hostRPC.call('featureFlagsUpdated', flags);
      for (let guest of this._guestRPC.values()) {
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
      if (
        isMessageEqual(data, {
          frame1: 'guest',
          frame2: 'sidebar',
          type: 'offer',
        })
      ) {
        this._connectGuest(ports[0]);
      }
    });
  }

  /**
   * Send an RPC message to the host frame.
   *
   * @param {SidebarToHostEvent} method
   * @param {unknown[]} args
   */
  notifyHost(method, ...args) {
    this._hostRPC.call(method, ...args);
  }

  /**
   * Focus annotations with the given $tags.
   *
   * This is used to indicate the highlight in the document that corresponds to
   * a given annotation in the sidebar.
   *
   * @param {string[]} tags - annotation $tags
   */
  focusAnnotations(tags) {
    this._store.focusAnnotations(tags);
    this._guestRPC.forEach(rpc => rpc.call('focusAnnotations', tags));
  }

  /**
   * Scroll the frame to the highlight for an annotation with a given tag.
   *
   * @param {string} tag
   */
  scrollToAnnotation(tag) {
    this._guestRPC.forEach(rpc => rpc.call('scrollToAnnotation', tag));
  }

  // Only used to cleanup tests
  destroy() {
    this._portFinder.destroy();
    this._listeners.removeAll();
  }
}
