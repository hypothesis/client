import { AnnotationSync } from './annotation-sync';
import Bridge from '../shared/bridge';
import * as frameUtil from './util/frame-util';
import FrameObserver from './frame-observer';

/**
 * @typedef {import('../shared/frame-rpc').RPC} RPC
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./util/emitter').EventBus} EventBus
 */

/**
 * `CrossFrame` provides a connection from the annotator to the sidebar.
 *
 * It can be used to publish events to and subscribe to events from the sidebar.
 *
 * This class also has logic for injecting Hypothesis into iframes that
 * are added to the page if they have the `enable-annotation` attribute set
 * and are same-origin with the current document.
 *
 * @implements Destroyable
 */
export class CrossFrame {
  /**
   * @param {Element} element
   * @param {EventBus} eventBus - Event bus for communicating with the annotator code (eg. the Guest)
   * @param {Record<string, any>} config
   */
  constructor(element, eventBus, config) {
    this._bridge = new Bridge();
    this._annotationSync = new AnnotationSync(eventBus, this._bridge);
    this._frameObserver = new FrameObserver(element);
    const frameIdentifiers = new Map();

    /**
     * Inject Hypothesis into a newly-discovered iframe.
     */
    const injectIntoFrame = frame => {
      if (frameUtil.hasHypothesis(frame)) {
        return;
      }

      frameUtil.isLoaded(frame, () => {
        // Generate a random string to use as a frame ID. The format is not important.
        const subFrameIdentifier = Math.random().toString().replace(/\D/g, '');
        frameIdentifiers.set(frame, subFrameIdentifier);
        const injectedConfig = {
          ...config,
          subFrameIdentifier,
        };

        const { clientUrl } = config;
        frameUtil.injectHypothesis(frame, clientUrl, injectedConfig);
      });
    };

    const iframeUnloaded = frame => {
      this._bridge.call('destroyFrame', frameIdentifiers.get(frame));
      frameIdentifiers.delete(frame);
    };

    this._frameObserver.observe(injectIntoFrame, iframeUnloaded);
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
    this._frameObserver.disconnect();
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
   * @param {(...args: any[]) => void} listener -- Final argument is an optional
   *   callback of the type: `(error: string|Error|null, ...result: any[]) => void`.
   *   This callback must be invoked in order to respond (via `postMessage`)
   *   to the other frame/s with a result or an error.
   * @throws {Error} If trying to register a callback after a channel has already been created
   * @throws {Error} If trying to register a callback with the same name multiple times
   */
  on(method, listener) {
    this._bridge.on(method, listener);
  }

  /**
   * Call an RPC method exposed by the sidebar to the annotator.
   *
   * @param {string} method
   * @param {any[]} args - Arguments to method. Final argument is an optional
   *   callback with this type: `(error: string|Error|null, ...result: any[]) => void`.
   *   This callback, if any, will be triggered once a response (via `postMessage`)
   *   comes back from the other frame/s. If the first argument (error) is `null`
   *   it means successful execution of the whole remote procedure call.
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
