/**
 * @typedef {import('../shared/bridge').default} Bridge
 */

/**
 * @callback RpcCallback
 * @param {Error|null} error
 * @param {any} result
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
   * @param {(event: string, callback: (data: any, callback: RpcCallback) => void) => void} options.on -
   *   Function that registers a listener for an event from the rest of the
   *   annotator
   * @param {(event: string, ...args: any[]) => void} options.emit -
   *   Function that publishes an event to the rest of the annotator
   */
  constructor(bridge, options) {
    this.bridge = bridge;

    /**
     * Mapping from annotation tags to annotation objects for annotations which
     * have been sent to or received from the sidebar.
     *
     * @type {{ [tag: string]: Object }}
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
   */
  sync(annotations) {
    this.bridge.call(
      'sync',
      annotations.map(ann => this._format(ann))
    );
  }

  /**
   * Assign a non-enumerable tag to objects which cross the bridge.
   * This tag is used to identify the objects between message.
   *
   * @param {string} [tag]
   */
  _tag(ann, tag) {
    if (ann.$tag) {
      return ann;
    }
    tag = tag || window.btoa(Math.random().toString());
    Object.defineProperty(ann, '$tag', {
      value: tag,
    });
    this.cache[tag] = ann;
    return ann;
  }

  /**
   * Copy annotation data from an RPC message into a local copy (in `this.cache`)
   * and return the local copy.
   */
  _parse(body) {
    const merged = Object.assign(this.cache[body.tag] || {}, body.msg);
    return this._tag(merged, body.tag);
  }

  /**
   * Format an annotation into an RPC message body.
   */
  _format(ann) {
    this._tag(ann);

    return {
      tag: ann.$tag,
      msg: ann,
    };
  }
}
