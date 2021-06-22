import Bridge from '../shared/bridge';

import AnnotationSync from './annotation-sync';
import { PortFinder } from './communicator';
import FrameObserver from './frame-observer';
import * as frameUtil from './util/frame-util';

/**
 * Generate a pseudo uuid to distinguish `guest` frames
 */
function generateToken() {
  return Math.random().toString().replace(/\D/g, '');
}
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
   * @param {MessagePort|null} hostPort -- enables to communicate between the
   * `host` and `sidebar` frames. If `null`, it indicates that this is a `guest`
   * frame.
   * @param {object} options
   *   @param {Record<string, any>} options.config,
   *   @param {boolean} [options.server]
   *   @param {(event: string, ...args: any[]) => void} options.on
   *   @param {(event: string, ...args: any[]) => void } options.emit
   */
  constructor(element, hostPort, options) {
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
        const subFrameIdentifier = generateToken();
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

    /**
     * Connect to the `sidebar` frame by either (1) using the `host` port in the
     * `hostToSidebar` channel or (2) discovering the `guest` port of the
     * `guestToSidebar` channel.
     */
    this.connectWithSidebar = () => {
      if (hostPort) {
        // Because `hostPort` is not `null` we know that this is a `host` frame.
        // In this case, use the `host` port of the `hostToSidebar` channel to
        // communicate with the `sidebar` frame.
        bridge.createChannelFromPort(hostPort, 'sidebar');
        return;
      }

      // This is a `guest` frame. Discover the `guest` port on the `guestToSidebar`
      // channel using the parent window
      const portFinder = new PortFinder();
      portFinder
        .discover({
          channel: 'guestToSidebar',
          hostFrame: window.parent,
          port: 'guest',
          subFrameIdentifier: config.subFrameIdentifier,
        })
        .then(port => bridge.createChannelFromPort(port, 'sidebar'));
    };
  }
}
