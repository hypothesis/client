import debounce from 'lodash.debounce';

import { Bridge } from '../../shared/bridge';
import { isReply, isPublic } from '../helpers/annotation-metadata';
import { watch } from '../util/watch';

/**
 * @typedef {import('../../types/bridge-events').SidebarToHostEvent} SidebarToHostEvent
 * @typedef {import('../../types/bridge-events').HostToSidebarEvent} HostToSidebarEvent
 * @typedef {import('../../types/bridge-events').SidebarToGuestEvent} SidebarToGuestEvent
 * @typedef {import('../../types/bridge-events').GuestToSidebarEvent} GuestToSidebarEvent
 * @typedef {import('../../shared/port-rpc').PortRPC} PortRPC
 */

/**
 * Return a minimal representation of an annotation that can be sent from the
 * sidebar app to a connected frame.
 *
 * Because this representation will be exposed to untrusted third-party
 * JavaScript, it includes only the information needed to uniquely identify it
 * within the current session and anchor it in the document.
 */
export function formatAnnot(ann) {
  return {
    tag: ann.$tag,
    msg: {
      document: ann.document,
      target: ann.target,
      uri: ann.uri,
    },
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
    /**
     * Channel for sidebar-host communication.
     *
     * @type {Bridge<SidebarToHostEvent,HostToSidebarEvent>}
     */
    this._hostRPC = new Bridge();

    /**
     * Channel for sidebar-guest(s) communication.
     *
     * @type {Bridge<SidebarToGuestEvent,GuestToSidebarEvent>}
     */
    this._guestRPC = new Bridge();

    this._store = store;
    this._window = $window;

    // Set of tags of annotations that are currently loaded into the frame
    const inFrame = new Set();

    /** Whether highlights are visible in guest frames. */
    this._highlightsVisible = false;

    /**
     * Watch for changes to the set of annotations displayed in the sidebar and
     * notify connected guests about new/updated/deleted annotations.
     */
    this._setupSyncToGuests = () => {
      let prevPublicAnns = 0;

      watch(
        store.subscribe,
        [() => store.allAnnotations(), () => store.frames()],
        ([annotations, frames], [prevAnnotations]) => {
          let publicAnns = 0;
          const inSidebar = new Set();
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
            if (!inFrame.has(annot.$tag)) {
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
            this._guestRPC.call('loadAnnotations', added.map(formatAnnot));
            added.forEach(annot => {
              inFrame.add(annot.$tag);
            });
          }
          deleted.forEach(annot => {
            this._guestRPC.call('deleteAnnotation', formatAnnot(annot));
            inFrame.delete(annot.$tag);
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
    };

    /**
     * Listen for messages coming in from connected guest frames and add new annotations
     * to the sidebar.
     */
    this._setupSyncFromGuests = () => {
      // A new annotation, note or highlight was created in the frame
      this._guestRPC.on('createAnnotation', event => {
        const annot = Object.assign({}, event.msg, { $tag: event.tag });
        // If user is not logged in, we can't really create a meaningful highlight
        // or annotation. Instead, we need to open the sidebar, show an error,
        // and delete the (unsaved) annotation so it gets un-selected in the
        // target document
        if (!store.isLoggedIn()) {
          this._hostRPC.call('openSidebar');
          store.openSidebarPanel('loginPrompt');
          this._guestRPC.call('deleteAnnotation', formatAnnot(annot));
          return;
        }
        inFrame.add(event.tag);

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
        annotationsService.create(annot);
      });

      // Map of annotation tag to anchoring status
      // ('anchored'|'orphan'|'timeout').
      //
      // Updates are coalesced to reduce the overhead from processing
      // triggered by each `UPDATE_ANCHOR_STATUS` action that is dispatched.

      /** @type {Record<string,'anchored'|'orphan'|'timeout'>} */
      let anchoringStatusUpdates = {};
      const scheduleAnchoringStatusUpdate = debounce(() => {
        store.updateAnchorStatus(anchoringStatusUpdates);
        anchoringStatusUpdates = {};
      }, 10);

      // Anchoring an annotation in the frame completed
      this._guestRPC.on('syncAnchoringStatus', events_ => {
        events_.forEach(event => {
          inFrame.add(event.tag);
          anchoringStatusUpdates[event.tag] = event.msg.$orphan
            ? 'orphan'
            : 'anchored';
          scheduleAnchoringStatusUpdate();
        });
      });

      this._guestRPC.on('showAnnotations', tags => {
        store.selectAnnotations(store.findIDsForTags(tags));
        store.selectTab('annotation');
      });

      this._guestRPC.on('focusAnnotations', tags => {
        store.focusAnnotations(tags || []);
      });

      this._guestRPC.on('toggleAnnotationSelection', tags => {
        store.toggleSelectedAnnotations(store.findIDsForTags(tags));
      });

      this._guestRPC.on('openSidebar', () => {
        this._hostRPC.call('openSidebar');
      });

      this._guestRPC.on('closeSidebar', () => {
        this._hostRPC.call('closeSidebar');
      });
    };
  }

  /**
   * Connect to the host frame and guest frame(s) in the current browser tab.
   */
  connect() {
    /**
     * Query the guest in a frame for the URL and metadata of the document that
     * is currently loaded and add the result to the set of connected frames.
     *
     * @param {PortRPC} channel
     */
    const addFrame = channel => {
      // Synchronize highlight visibility in this guest with the sidebar's controls.
      channel.call('setHighlightsVisible', this._highlightsVisible);

      channel.call('getDocumentInfo', (err, info) => {
        if (err) {
          channel.destroy();
          return;
        }

        this._store.connectFrame({
          id: info.frameIdentifier,
          metadata: info.metadata,
          uri: info.uri,
        });
      });
    };

    this._guestRPC.onConnect(addFrame);

    // Listen for messages from new guest frames that want to connect.
    //
    // The message will include a `MessagePort` to use for communication with
    // the guest.
    this._window.addEventListener('message', e => {
      if (e.data?.type !== 'hypothesisGuestReady') {
        return;
      }
      if (e.ports.length === 0) {
        console.warn(
          'Ignoring `hypothesisGuestReady` message without a MessagePort'
        );
        return;
      }
      const port = e.ports[0];
      this._guestRPC.createChannel(port);
    });

    this._setupSyncToGuests();
    this._setupSyncFromGuests();

    this._hostRPC.on('sidebarOpened', () => {
      this._store.setSidebarOpened(true);
    });

    // Listen for notifications of a guest being unloaded. This message is routed
    // via the host frame rather than coming directly from the unloaded guest
    // to work around https://bugs.webkit.org/show_bug.cgi?id=231167.
    this._hostRPC.on('frameDestroyed', frameIdentifier => {
      const frame = this._store.frames().find(f => f.id === frameIdentifier);
      if (frame) {
        this._store.destroyFrame(frame);
      }
    });

    // When user toggles the highlight visibility control in the sidebar container,
    // update the visibility in all the guest frames.
    this._hostRPC.on('setHighlightsVisible', visible => {
      this._highlightsVisible = visible;
      this._guestRPC.call('setHighlightsVisible', visible);
    });

    // Create channel for sidebar <-> host communication and send port to host.
    //
    // This also serves to notify the host that the sidebar application is ready.
    const hostChannel = new MessageChannel();
    this._hostRPC.createChannel(hostChannel.port1);
    this._window.parent.postMessage({ type: 'hypothesisSidebarReady' }, '*', [
      hostChannel.port2,
    ]);
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
    this._guestRPC.call('focusAnnotations', tags);
  }

  /**
   * Scroll the frame to the highlight for an annotation with a given tag.
   *
   * @param {string} tag
   */
  scrollToAnnotation(tag) {
    this._guestRPC.call('scrollToAnnotation', tag);
  }
}
