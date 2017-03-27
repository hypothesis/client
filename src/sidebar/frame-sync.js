'use strict';

var events = require('./events');
var bridgeEvents = require('../shared/bridge-events');
var metadata = require('./annotation-metadata');
var uiConstants = require('./ui-constants');

/**
 * @typedef FrameInfo
 * @property {string} uri - Current primary URI of the document being displayed
 * @property {string[]} searchUris - List of URIs that should be passed to the
 *           search API when searching for annotations on this document.
 * @property {string} documentFingerprint - Fingerprint of the document, used
 *                    for PDFs
 */

 /**
  * Return a minimal representation of an annotation that can be sent from the
  * sidebar app to a connected frame.
  *
  * Because this representation will be exposed to untrusted third-party
  * JavaScript, it includes only the information needed to uniquely identify it
  * within the current session and anchor it in the document.
  */
function formatAnnot(ann) {
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
// @ngInject
function FrameSync($rootScope, $window, Discovery, annotationUI, bridge) {

  // Set of tags of annotations that are currently loaded into the frame
  var inFrame = new Set();
  var prevAnnotations = [];
  var prevFrames = [];
  var prevPublicAnns = 0;

  /**
   * Watch for changes to the set of annotations displayed in the sidebar and
   * notify connected frames about new/updated/deleted annotations.
   */
  function setupSyncToFrame() {
    // List of loaded annotations in previous state
    annotationUI.subscribe(updateAnnotations);
  }

  function updateAnnotations() {
    var state = annotationUI.getState();
    if (state.annotations === prevAnnotations &&
      state.frames === prevFrames) {
      return;
    }

    var publicAnns = 0;
    var inSidebar = new Set();
    var added = [];

    state.annotations.forEach(function (annot) {
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
    var deleted = prevAnnotations.filter(function (annot) {
      return !inSidebar.has(annot.$tag);
    });
    prevAnnotations = state.annotations;
    prevFrames = state.frames;

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

    var frames = annotationUI.frames();
    if (frames.length > 0) {
      if (frames.every(function (frame) { return frame.isAnnotationFetchComplete; })) {
        if (publicAnns === 0 || publicAnns !== prevPublicAnns) {
          bridge.call(bridgeEvents.PUBLIC_ANNOTATION_COUNT_CHANGED, publicAnns);
          prevPublicAnns = publicAnns;
        }
      }
    }
  }

  /**
   * Listen for messages coming in from connected frames and add new annotations
   * to the sidebar.
   */
  function setupSyncFromFrame() {
    // A new annotation, note or highlight was created in the frame
    bridge.on('beforeCreateAnnotation', function (event) {
      inFrame.add(event.tag);
      var annot = Object.assign({}, event.msg, {$tag: event.tag});
      $rootScope.$broadcast(events.BEFORE_ANNOTATION_CREATED, annot);
    });

    // Anchoring an annotation in the frame completed
    bridge.on('sync', function (events_) {
      events_.forEach(function (event) {
        inFrame.add(event.tag);
        annotationUI.updateAnchorStatus(null, event.tag, event.msg.$orphan);
        $rootScope.$broadcast(events.ANNOTATIONS_SYNCED, [event.tag]);
      });
    });

    bridge.on('showAnnotations', function (tags) {
      annotationUI.selectAnnotations(annotationUI.findIDsForTags(tags));
      annotationUI.selectTab(uiConstants.TAB_ANNOTATIONS);
    });

    bridge.on('focusAnnotations', function (tags) {
      annotationUI.focusAnnotations(tags || []);
    });

    bridge.on('toggleAnnotationSelection', function (tags) {
      annotationUI.toggleSelectedAnnotations(annotationUI.findIDsForTags(tags));
    });

    bridge.on('sidebarOpened', function () {
      $rootScope.$broadcast('sidebarOpened');
    });
  }

  /**
   * Query the Hypothesis annotation client in a frame for the URL and metadata
   * of the document that is currently loaded and add the result to the set of
   * connected frames.
   */
  function addFrame(channel) {
    channel.call('getDocumentInfo', function (err, info) {
      var searchUris = [];

      if (err) {
        channel.destroy();
      } else {
        searchUris = [info.uri];
      }

      var documentFingerprint;
      if (info.metadata && info.metadata.documentFingerprint) {
        documentFingerprint = info.metadata.documentFingerprint;
        searchUris = info.metadata.link.map(function (link) {
          return link.href;
        });
      }

      annotationUI.connectFrame({
        uri: info.uri,
        searchUris: searchUris,
        documentFingerprint: documentFingerprint,
      });
    });
  }

  /**
   * Find and connect to Hypothesis clients in the current window.
   */
  this.connect = function () {
    var discovery = new Discovery(window, {server: true});
    discovery.startDiscovery(bridge.createChannel.bind(bridge));
    bridge.onConnect(addFrame);

    window.bridge = bridge;
    window.discovery = discovery;
    bridge.on('reloadAnnotations', function() {
      // THESIS TODO: This is all temporary code.
      // Since frame-sync can't distinguish between different documents, all annotations are
      // already loaded in. Simply reload these annotations again.
      prevAnnotations = [];
      prevFrames = [];
      prevPublicAnns = 0;

      var state = annotationUI.getState();
      var added = [];
      state.annotations.forEach(function (annot) {
        if (metadata.isReply(annot)) {
          // The frame does not need to know about replies
          return;
        }
        added.push(annot);
      });
      bridge.call('loadAnnotations', added.map(formatAnnot));
    });

    setupSyncToFrame();
    setupSyncFromFrame();
  };

  /**
   * Focus annotations with the given tags.
   *
   * This is used to indicate the highlight in the document that corresponds to
   * a given annotation in the sidebar.
   *
   * @param {string[]} tags
   */
  this.focusAnnotations = function (tags) {
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

module.exports = {
  default: FrameSync,
  formatAnnot: formatAnnot,
};
