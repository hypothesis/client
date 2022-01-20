import debounce from 'lodash.debounce';

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
     * Channels for sidebar-guest(s) communication.
     *
     * @type {PortRPC<GuestToSidebarEvent, SidebarToGuestEvent>[]}
     */
    this._guestRPC = [];

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
  }

  /**
   * Watch for changes to the set of annotations loaded in the sidebar and
   * notify connected guests about new/updated/deleted annotations.
   */
  _setupSyncToGuests() {
    let prevPublicAnns = 0;

    watch(
      this._store.subscribe,
      [() => this._store.allAnnotations(), () => this._store.frames()],
      /**
       * @param {[Annotation[], Frame[]]} current
       * @param {[Annotation[]]} previous
       */
      ([annotations, frames], [prevAnnotations]) => {
        let publicAnns = 0;
        /** @type {Set<string>} */
        const inSidebar = new Set();
        /** @type {Annotation[]} */
        const added = [];

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

        // We currently only handle adding and removing annotations from the frame
        // when they are added or removed in the sidebar, but not re-anchoring
        // annotations if their selectors are updated.
        if (added.length > 0) {
          // We currently send all loaded annotations to all connected guests,
          // but we should only send annotations to appropriate guests.
          // See https://github.com/hypothesis/client/issues/3992.
          this._guestRPC.forEach(rpc =>
            rpc.call('loadAnnotations', added.map(formatAnnot))
          );
          added.forEach(annot => {
            this._inFrame.add(annot.$tag);
          });
        }
        deleted.forEach(annot => {
          this._guestRPC.forEach(rpc =>
            rpc.call('deleteAnnotation', annot.$tag)
          );
          this._inFrame.delete(annot.$tag);
        });

        if (frames.length > 0) {
          if (frames.every(frame => frame.isAnnotationFetchComplete)) {
            if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
              this._hostRPC.call('publicAnnotationCountChanged', publicAnns);
              prevPublicAnns = publicAnns;
            }
          }
        }
      }
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
    this._guestRPC.push(guestRPC);

    /** @type {string|null} */
    let frameIdentifier;

    // Update document metadata for this guest. We currently assume that the
    // guest will make this call once after it connects. To handle updates
    // to the document, we'll need to change `connectFrame` to update rather than
    // add to the frame list.
    guestRPC.on('documentInfoChanged', info => {
      frameIdentifier = info.frameIdentifier;
      this._store.connectFrame({
        id: info.frameIdentifier,
        metadata: info.metadata,
        uri: info.uri,
      });
    });

    guestRPC.on('frameDestroyed', () => {
      const frame = this._store.frames().find(f => f.id === frameIdentifier);
      if (frame) {
        this._store.destroyFrame(frame);
      }
      guestRPC.destroy();
      this._guestRPC = this._guestRPC.filter(rpc => rpc !== guestRPC);
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
   * Connect to the host frame and guest frame(s) in the current browser tab.
   */
  async connect() {
    // Create channel for sidebar-host communication.
    const hostPort = await this._portFinder.discover('host');
    this._hostRPC.connect(hostPort);
    this._hostRPC.call('ready');

    // Listen for guests connecting to the sidebar.
    this._listeners.add(hostPort, 'message', event => {
      const { data, ports } = /** @type {MessageEvent} */ (event);
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
   * @param {any[]} args
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
