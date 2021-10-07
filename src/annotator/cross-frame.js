import { Bridge } from '../shared/bridge';
import { AnnotationSync } from './annotation-sync';

/**
 * @typedef {import('../shared/port-rpc').PortRPC} RPC
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./util/emitter').EventBus} EventBus
 */

/**
 * `CrossFrame` provides a connection from the annotator to the sidebar.
 *
 * It can be used to publish events to and subscribe to events from the sidebar.
 *
 * @implements Destroyable
 */
export class CrossFrame {
  /**
   * @param {EventBus} eventBus - Event bus for communicating with the annotator code (eg. the Guest)
   */
  constructor(eventBus) {
    this._bridge = new Bridge();
    this._annotationSync = new AnnotationSync(eventBus, this._bridge);
  }

  /**
   * Attempt to connect to the sidebar frame.
   *
   * Returns a promise that resolves once the connection has been established.
   *
   * @param {Window} frame - The window containing the sidebar application
   * @param {string} origin - Origin of the sidebar application (eg. 'https://hypothes.is/')
   */
  connectToSidebar(frame, origin) {
    const channel = new MessageChannel();
    frame.postMessage(
      {
        type: 'hypothesisGuestReady',
      },
      origin,
      [channel.port2]
    );
    this._bridge.createChannel(channel.port1);
  }

  /**
   * Remove the connection between the sidebar and annotator.
   */
  destroy() {
    this._bridge.destroy();
    this._annotationSync.destroy();
  }

  /**
   * Notify the sidebar about new annotations created in the page.
   *
   * @param {AnnotationData[]} annotations
   */
  sync(annotations) {
    this._annotationSync.sync(annotations);
  }

  /**
   * Subscribe to an event from the sidebar.
   *
   * @param {string} method
   * @param {(...args: any[]) => void} listener
   *
   * @see {Bridge.on} for details.
   */
  on(method, listener) {
    this._bridge.on(method, listener);
  }

  /**
   * Call an RPC method exposed by the sidebar to the annotator.
   *
   * @param {string} method - Name of remote method to call.
   * @param {any[]} args
   *
   * @see {Bridge.call} for details.
   */
  call(method, ...args) {
    this._bridge.call(method, ...args);
  }

  /**
   * Register a callback to be invoked once the connection to the sidebar
   * is set up.
   *
   * @param {(channel: RPC) => void} callback
   */
  onConnect(callback) {
    this._bridge.onConnect(callback);
  }
}
