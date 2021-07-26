import AnnotationSync from './annotation-sync';
import Bridge from '../shared/bridge';
import * as frameUtil from './util/frame-util';
import FrameObserver from './frame-observer';

/**
 * @typedef {import('../types/annotator').AnnotationData} AnnotationData
 * @typedef {import('../types/annotator').Destroyable} Destroyable
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
   * @param {object} options
   *   @param {Record<string, any>} options.config,
   *   @param {(event: string, ...args: any[]) => void} options.on
   *   @param {(event: string, ...args: any[]) => void } options.emit
   */
  constructor(element, options) {
    const { config, on, emit } = options;
    const bridge = new Bridge();
    const annotationSync = new AnnotationSync(bridge, { on, emit });
    const frameObserver = new FrameObserver(element);
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
      bridge.call('destroyFrame', frameIdentifiers.get(frame));
      frameIdentifiers.delete(frame);
    };

    frameObserver.observe(injectIntoFrame, iframeUnloaded);

    /**
     * Attempt to connect to the sidebar frame.
     *
     * Returns a promise that resolves once the connection has been established.
     *
     * @param {Window} frame - The window containing the sidebar application
     * @param {string} origin - Origin of the sidebar application (eg. 'https://hypothes.is/')
     */
    this.connectToSidebar = (frame, origin) => {
      const channel = new MessageChannel();
      frame.postMessage(
        {
          type: 'hypothesisGuestReady',
          port: channel.port2,
        },
        origin,
        [channel.port2]
      );
      bridge.createChannel(channel.port1);
    };

    /**
     * Remove the connection between the sidebar and annotator.
     */
    this.destroy = () => {
      bridge.destroy();
      frameObserver.disconnect();
    };

    /**
     * Notify the sidebar about new annotations created in the page.
     *
     * @param {AnnotationData[]} annotations
     */
    this.sync = annotations => annotationSync.sync(annotations);

    /**
     * Subscribe to an event from the sidebar.
     *
     * @param {string} event
     * @param {(...args: any[]) => void} callback
     */
    this.on = (event, callback) => bridge.on(event, callback);

    /**
     * Call an RPC method exposed by the sidebar to the annotator.
     *
     * @param {string} method
     * @param {any[]} args
     */
    this.call = (method, ...args) => bridge.call(method, ...args);

    /**
     * Register a callback to be invoked once the connection to the sidebar
     * is set up.
     *
     * @param {(...args: any[]) => void} callback
     */
    this.onConnect = callback => bridge.onConnect(callback);
  }
}
