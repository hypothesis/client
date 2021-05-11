import debounce from 'lodash.debounce';

import bridgeEvents from '../../shared/bridge-events';
import Discovery from '../../shared/discovery';
import * as metadata from '../helpers/annotation-metadata';
import { watch } from '../util/watch';

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
 * This service runs in the sidebar and is responsible for keeping the set of
 * annotations displayed in connected frames in sync with the set shown in the
 * sidebar.
 */
// @inject
export default function FrameSync(annotationsService, bridge, store) {
  // Set of tags of annotations that are currently loaded into the frame
  const inFrame = new Set();

  /**
   * Watch for changes to the set of annotations displayed in the sidebar and
   * notify connected frames about new/updated/deleted annotations.
   */
  function setupSyncToFrame() {
    let prevPublicAnns = 0;

    watch(
      store.subscribe,
      [() => store.getState().annotations.annotations, () => store.frames()],
      ([annotations, frames], [prevAnnotations]) => {
        let publicAnns = 0;
        const inSidebar = new Set();
        const added = [];

        annotations.forEach(function (annot) {
          if (metadata.isReply(annot)) {
            // The frame does not need to know about replies
            return;
          }

          if (metadata.isPublic(annot)) {
            ++publicAnns;
          }

          inSidebar.add(annot.$tag);
          if (!inFrame.has(annot.$tag)) {
            added.push(annot);
          }
        });
        const deleted = prevAnnotations.filter(function (annot) {
          return !inSidebar.has(annot.$tag);
        });

        // We currently only handle adding and removing annotations from the frame
        // when they are added or removed in the sidebar, but not re-anchoring
        // annotations if their selectors are updated.
        if (added.length > 0) {
          bridge.call('loadAnnotations', added.map(formatAnnot));
          added.forEach(function (annot) {
            inFrame.add(annot.$tag);
          });
        }
        deleted.forEach(function (annot) {
          bridge.call('deleteAnnotation', formatAnnot(annot));
          inFrame.delete(annot.$tag);
        });

        if (frames.length > 0) {
          if (
            frames.every(function (frame) {
              return frame.isAnnotationFetchComplete;
            })
          ) {
            if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
              bridge.call(
                bridgeEvents.PUBLIC_ANNOTATION_COUNT_CHANGED,
                publicAnns
              );
              prevPublicAnns = publicAnns;
            }
          }
        }
      }
    );
  }

  /**
   * Listen for messages coming in from connected frames and add new annotations
   * to the sidebar.
   */
  function setupSyncFromFrame() {
    // A new annotation, note or highlight was created in the frame
    bridge.on('beforeCreateAnnotation', function (event) {
      const annot = Object.assign({}, event.msg, { $tag: event.tag });
      // If user is not logged in, we can't really create a meaningful highlight
      // or annotation. Instead, we need to open the sidebar, show an error,
      // and delete the (unsaved) annotation so it gets un-selected in the
      // target document
      if (!store.isLoggedIn()) {
        bridge.call('showSidebar');
        store.openSidebarPanel('loginPrompt');
        bridge.call('deleteAnnotation', formatAnnot(annot));
        return;
      }
      inFrame.add(event.tag);

      // Create the new annotation in the sidebar.
      annotationsService.create(annot);
    });

    bridge.on('destroyFrame', frameIdentifier => destroyFrame(frameIdentifier));

    // Map of annotation tag to anchoring status
    // ('anchored'|'orphan'|'timeout').
    //
    // Updates are coalesced to reduce the overhead from processing
    // triggered by each `UPDATE_ANCHOR_STATUS` action that is dispatched.
    let anchoringStatusUpdates = {};
    const scheduleAnchoringStatusUpdate = debounce(() => {
      store.updateAnchorStatus(anchoringStatusUpdates);
      anchoringStatusUpdates = {};
    }, 10);

    // Anchoring an annotation in the frame completed
    bridge.on('sync', function (events_) {
      events_.forEach(function (event) {
        inFrame.add(event.tag);
        anchoringStatusUpdates[event.tag] = event.msg.$orphan
          ? 'orphan'
          : 'anchored';
        scheduleAnchoringStatusUpdate();
      });
    });

    bridge.on('showAnnotations', function (tags) {
      store.selectAnnotations(store.findIDsForTags(tags));
      store.selectTab('annotation');
    });

    bridge.on('focusAnnotations', function (tags) {
      store.focusAnnotations(tags || []);
    });

    bridge.on('toggleAnnotationSelection', function (tags) {
      store.toggleSelectedAnnotations(store.findIDsForTags(tags));
    });

    bridge.on('sidebarOpened', function () {
      store.setSidebarOpened(true);
    });

    // These invoke the matching methods by name on the Guests
    bridge.on('showSidebar', function () {
      bridge.call('showSidebar');
    });
    bridge.on('hideSidebar', function () {
      bridge.call('hideSidebar');
    });
    bridge.on('setVisibleHighlights', function (state) {
      bridge.call('setVisibleHighlights', state);
    });
    bridge.on('setDoodleability', function (state) {
      bridge.call('setDoodleability', state);
    });
    bridge.on('setDoodleOptions', function (state) {
      bridge.call('setDoodleOptions', state);
    });
    bridge.on('saveCurrentDoodle', function (state) {
      bridge.call('saveCurrentDoodle', state);
    });
  }

  /**
   * Query the Hypothesis annotation client in a frame for the URL and metadata
   * of the document that is currently loaded and add the result to the set of
   * connected frames.
   */
  function addFrame(channel) {
    channel.call('getDocumentInfo', function (err, info) {
      if (err) {
        channel.destroy();
        return;
      }

      store.connectFrame({
        id: info.frameIdentifier,
        metadata: info.metadata,
        uri: info.uri,
      });
    });
  }

  function destroyFrame(frameIdentifier) {
    const frames = store.frames();
    const frameToDestroy = frames.find(function (frame) {
      return frame.id === frameIdentifier;
    });
    if (frameToDestroy) {
      store.destroyFrame(frameToDestroy);
    }
  }

  /**
   * Find and connect to Hypothesis clients in the current window.
   */
  this.connect = function () {
    const discovery = new Discovery(window, { server: true });
    discovery.startDiscovery(bridge.createChannel.bind(bridge));
    bridge.onConnect(addFrame);

    setupSyncToFrame();
    setupSyncFromFrame();
  };

  /**
   * Focus annotations with the given $tags.
   *
   * This is used to indicate the highlight in the document that corresponds to
   * a given annotation in the sidebar.
   *
   * @param {string[]} tags - annotation $tags
   */
  this.focusAnnotations = function (tags) {
    store.focusAnnotations(tags);
    bridge.call('focusAnnotations', tags);
  };

  /**
   * Scroll the frame to the highlight for an annotation with a given tag.
   *
   * @param {string} tag
   */
  this.scrollToAnnotation = function (tag) {
    bridge.call('scrollToAnnotation', tag);
  };
}
