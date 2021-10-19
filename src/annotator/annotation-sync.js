import { TinyEmitter } from 'tiny-emitter';

/**
 * @typedef {import('../shared/bridge').Bridge<GuestToSidebarEvent,SidebarToGuestEvent>} SidebarBridge
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('../types/bridge-events').GuestToSidebarEvent} GuestToSidebarEvent
 * @typedef {import('../types/bridge-events').SidebarToGuestEvent} SidebarToGuestEvent
 */

/**
 * Message sent between the sidebar and annotator about an annotation that has
 * changed.
 *
 * @typedef RpcMessage
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
export class AnnotationSync extends TinyEmitter {
  /**
   * @param {SidebarBridge} bridge - Channel for communicating with the sidebar
   */
  constructor(bridge) {
    super();

    this._sidebar = bridge;

    /**
     * Mapping from annotation tags to annotation objects for annotations which
     * have been sent to or received from the sidebar.
     *
     * @type {{ [tag: string]: AnnotationData }}
     */
    this.cache = {};

    this.destroyed = false;

    // Relay events from the sidebar to the rest of the annotator.
    this._sidebar.on('deleteAnnotation', (body, callback) => {
      if (this.destroyed) {
        callback(null);
        return;
      }
      const annotation = this._parse(body);
      delete this.cache[annotation.$tag];
      this.emit('annotationDeleted', annotation);
      this._format(annotation);
      callback(null);
    });

    this._sidebar.on('loadAnnotations', (bodies, callback) => {
      if (this.destroyed) {
        callback(null);
        return;
      }
      const annotations = bodies.map(body => this._parse(body));
      this.emit('annotationsLoaded', annotations);
      callback(null);
    });
  }

  /**
   * @param {AnnotationData} annotation
   */
  createAnnotation(annotation) {
    if (annotation.$tag) {
      return;
    }
    this._sidebar.call('createAnnotation', this._format(annotation));
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

    this._sidebar.call(
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
    tag = tag || window.btoa(Math.random().toString());
    Object.defineProperty(annotation, '$tag', {
      value: tag,
    });
    this.cache[tag] = annotation;
    return annotation;
  }

  /**
   * Copy annotation data from an RPC message into a local copy (in `this.cache`)
   * and return the local copy.
   *
   * @param {RpcMessage} body
   * @return {AnnotationData}
   */
  _parse(body) {
    const merged = Object.assign(this.cache[body.tag] || {}, body.msg);
    return this._tag(merged, body.tag);
  }

  /**
   * Format an annotation into an RPC message body.
   *
   * @param {AnnotationData} annotation
   * @return {RpcMessage}
   */
  _format(annotation) {
    this._tag(annotation);

    return {
      tag: annotation.$tag,
      msg: annotation,
    };
  }

  destroy() {
    this.destroyed = true;
  }
}
