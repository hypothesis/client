import { generateHexString } from '../shared/random';

/**
 * @typedef {import('../shared/bridge').Bridge<GuestToSidebarEvent,SidebarToGuestEvent>} SidebarBridge
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('../types/bridge-events').GuestToSidebarEvent} GuestToSidebarEvent
 * @typedef {import('../types/bridge-events').SidebarToGuestEvent} SidebarToGuestEvent
 * @typedef {import('./util/emitter').EventBus} EventBus
 */

/**
 * Message sent between the sidebar and annotator about an annotation that has
 * changed.
 *
 * @typedef RPCMessage
 * @prop {string} tag
 * @prop {AnnotationData} msg
 */

/**
 * AnnotationSync listens for messages from the sidebar app indicating that
 * annotations have been added or removed and relays them to Guest.
 *
 * It also listens for events from Guest when new annotations are created or
 * annotations successfully anchor and relays these to the sidebar app.
 *
 * @implements Destroyable
 */
export class AnnotationSync {
  /**
   * @param {SidebarBridge} sidebarBridge - Channel for communicating with the sidebar
   * @param {object} options
   *   @param {(annotation: AnnotationData) => void} options.onAnnotationDeleted
   *   @param {(annotations: AnnotationData[]) => void} options.onAnnotationsLoaded
   */
  constructor(sidebarBridge, { onAnnotationDeleted, onAnnotationsLoaded }) {
    this._sidebarRPC = sidebarBridge;

    /**
     * Mapping from annotation tags to annotation objects for annotations which
     * have been sent to or received from the sidebar.
     *
     * @type {Map<string, AnnotationData>}
     */
    this._cache = new Map();

    this.destroyed = false;

    // Relay events from the sidebar to the rest of the annotator.
    this._sidebarRPC.on('deleteAnnotation', (body, callback) => {
      if (this.destroyed) {
        callback(null);
        return;
      }
      const annotation = this._parse(body);
      this._cache.delete(annotation.$tag);
      onAnnotationDeleted(annotation);
      callback(null);
    });

    this._sidebarRPC.on('loadAnnotations', (bodies, callback) => {
      if (this.destroyed) {
        callback(null);
        return;
      }
      const annotations = bodies.map(body => this._parse(body));
      onAnnotationsLoaded(annotations);
      callback(null);
    });
  }

  /**
   * Relay updated annotations from the annotator to the sidebar.
   *
   * This is called for example after annotations are anchored to notify the
   * sidebar about the current anchoring status.
   *
   * @param {AnnotationData[]} annotations
   */
  sync(annotations) {
    if (this.destroyed) {
      return;
    }

    this._sidebarRPC.call(
      'syncAnchoringStatus',
      annotations.map(ann => this._format(ann))
    );
  }

  /**
   * Assign a non-enumerable "tag" to identify annotations exchanged between
   * the sidebar and annotator and associate the tag with the `annotation` instance
   * in the local cache.
   *
   * @param {AnnotationData} annotation
   * @param {string} [tag] - The tag to assign
   * @return {AnnotationData}
   */
  _tag(annotation, tag) {
    if (annotation.$tag) {
      return annotation;
    }
    const $tag = tag || 'a:' + generateHexString(8);
    // In-place mutation is needed because `Guest` compares the annotation object
    annotation.$tag = $tag;
    this._cache.set($tag, annotation);
    return annotation;
  }

  /**
   * Copy annotation data from an RPC message into a local copy (in `this.cache`)
   * and return the local copy.
   *
   * @param {RPCMessage} body
   * @return {AnnotationData}
   */
  _parse({ tag, msg }) {
    const cachedAnnotation = this._cache.get(tag) || {};
    // In-place mutation is needed because `Guest` compares the annotation object
    const merged = Object.assign(cachedAnnotation, msg);
    return this._tag(merged, tag);
  }

  /**
   * Format an annotation into an RPC message body.
   *
   * @param {AnnotationData} annotation
   * @return {RPCMessage}
   */
  _format(annotation) {
    const taggedAnnotation = this._tag(annotation);

    return {
      tag: taggedAnnotation.$tag,
      msg: taggedAnnotation,
    };
  }

  /**
   * Send, if needed, a formatted annotation to the sidebar frame
   *
   * @param {AnnotationData} annotation
   */
  sendToSidebar(annotation) {
    if (annotation.$tag) {
      return;
    }
    this._sidebarRPC.call('createAnnotation', this._format(annotation));
  }

  destroy() {
    this.destroyed = true;
  }
}
