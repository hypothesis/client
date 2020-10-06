/**
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../shared/bridge').default} Bridge
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
 */
export default class AnnotationSync {
  /**
   * @param {Bridge} bridge
   * @param {Object} options
   *   @param {(event: string, callback: (...args: any[]) => void) => void} options.on -
   *     Function that registers a listener for an event from the rest of the
   *     annotator
   *   @param {(event: string, ...args: any[]) => void} options.emit -
   *     Function that publishes an event to the rest of the annotator
   */
  constructor(bridge, options) {
    this.bridge = bridge;

    /**
     * Mapping from annotation tags to annotation objects for annotations which
     * have been sent to or received from the sidebar.
     *
     * @type {{ [tag: string]: AnnotationData }}
     */
    this.cache = {};

    this._on = options.on;
    this._emit = options.emit;

    // Relay events from the sidebar to the rest of the annotator.
    this.bridge.on('deleteAnnotation', (body, callback) => {
      const annotation = this._parse(body);
      delete this.cache[annotation.$tag];
      this._emit('annotationDeleted', annotation);
      callback(null, this._format(annotation));
    });

    this.bridge.on('loadAnnotations', (bodies, callback) => {
      const annotations = bodies.map(body => this._parse(body));
      this._emit('annotationsLoaded', annotations);
      callback(null, annotations);
    });

    // Relay events from annotator to sidebar.
    this._on('beforeAnnotationCreated', annotation => {
      if (annotation.$tag) {
        return;
      }
      this.bridge.call('beforeCreateAnnotation', this._format(annotation));
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
    this.bridge.call(
      'sync',
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
}
