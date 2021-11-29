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
   *   @param {(tag: string) => void} options.onAnnotationDeleted
   *   @param {(annotations: AnnotationData[]) => void} options.onAnnotationsLoaded
   */
  constructor(sidebarBridge, { onAnnotationDeleted, onAnnotationsLoaded }) {
    this._sidebarRPC = sidebarBridge;
    this.destroyed = false;

    // Relay events from the sidebar to the rest of the annotator.
    this._sidebarRPC.on(
      'deleteAnnotation',
      (/** @type {RPCMessage} */ { tag }, callback) => {
        if (this.destroyed) {
          callback(null);
          return;
        }
        onAnnotationDeleted(tag);
        callback(null);
      }
    );

    this._sidebarRPC.on(
      'loadAnnotations',
      (/** @type {RPCMessage[]} */ bodies, callback) => {
        if (this.destroyed) {
          callback(null);
          return;
        }
        const annotations = bodies.map(({ msg, tag: $tag }) => ({
          ...msg,
          $tag,
        }));
        onAnnotationsLoaded(annotations);
        callback(null);
      }
    );
  }

  /**
   * Relay updated annotation from the annotator to the sidebar.
   *
   * This is called for example after annotations are anchored to notify the
   * sidebar about the current anchoring status.
   *
   * @param {AnnotationData} annotation
   */
  sync(annotation) {
    if (this.destroyed) {
      return;
    }

    this._sidebarRPC.call('syncAnchoringStatus', this._format(annotation));
  }

  /**
   * Format an annotation into an RPC message body.
   *
   * @param {AnnotationData} annotation
   * @return {RPCMessage}
   */
  _format(annotation) {
    return {
      tag: annotation.$tag,
      msg: annotation,
    };
  }

  /**
   * Send annotation to the sidebar frame
   *
   * @param {AnnotationData} annotation
   */
  sendToSidebar(annotation) {
    if (this.destroyed) {
      return;
    }

    this._sidebarRPC.call('createAnnotation', this._format(annotation));
  }

  destroy() {
    this.destroyed = true;
  }
}
