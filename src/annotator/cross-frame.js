import AnnotationSync from './annotation-sync';
import FrameObserver from './frame-observer';
import * as frameUtil from './util/frame-util';

/**
 * Generate a pseudo uuid to distinguish `guest` frames
 */
function generateToken() {
  return Math.random().toString().replace(/\D/g, '');
}
/**
 * @typedef {import('../shared/bridge').default} Bridge
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
   * @param {EventBus} eventBus - enables intra-frame communication
   * @param {Bridge} bridge - enables to inter-frame communication
   * @param {Record<string, any>} config
   */
  constructor(element, eventBus, bridge, config) {
    const frameObserver = new FrameObserver(element);
    const annotationSync = new AnnotationSync(eventBus, bridge);
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
      annotationSync.destroy();
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
