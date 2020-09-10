// @ts-expect-error - `Plugin` base class is still written in CoffeeScript
import Plugin from '../plugin';

import AnnotationSync from '../annotation-sync';
import Bridge from '../../shared/bridge';
import Discovery from '../../shared/discovery';
import * as frameUtil from '../util/frame-util';
import FrameObserver from '../frame-observer';

/**
 * @typedef {import('../../types/annotator').AnnotationData} AnnotationData
 */

/**
 * `CrossFrame` provides a connection from the annotator to the sidebar.
 *
 * It can be used to publish events to and subscribe to events from the sidebar.
 *
 * This class also has logic for injecting Hypothesis into iframes that
 * are added to the page if they have the `enable-annotation` attribute set
 * and are same-origin with the current document.
 */
export default class CrossFrame extends Plugin {
  constructor(element, options) {
    super(element, options);

    const { config, server, on, emit } = options;
    const discovery = new Discovery(window, { server });
    const bridge = new Bridge();
    const annotationSync = new AnnotationSync(bridge, { on, emit });
    const frameObserver = new FrameObserver(element);
    const frameIdentifiers = new Map();

    /**
     * Inject Hypothesis into a newly-discovered iframe.
     */
    const injectToFrame = frame => {
      if (!frameUtil.hasHypothesis(frame)) {
        const { clientUrl } = config;

        frameUtil.isLoaded(frame, () => {
          const subFrameIdentifier = discovery.generateToken();
          frameIdentifiers.set(frame, subFrameIdentifier);
          const injectedConfig = Object.assign({}, config, {
            subFrameIdentifier,
          });

          frameUtil.injectHypothesis(frame, clientUrl, injectedConfig);
        });
      }
    };

    const iframeUnloaded = frame => {
      bridge.call('destroyFrame', frameIdentifiers.get(frame));
      frameIdentifiers.delete(frame);
    };

    /**
     * Initiate the connection to the sidebar.
     */
    this.pluginInit = () => {
      const onDiscoveryCallback = (source, origin, token) =>
        bridge.createChannel(source, origin, token);

      discovery.startDiscovery(onDiscoveryCallback);

      frameObserver.observe(injectToFrame, iframeUnloaded);
    };

    /**
     * Remove the connection between the sidebar and annotator.
     */
    this.destroy = () => {
      bridge.destroy();
      discovery.stopDiscovery();
      frameObserver.disconnect();

      super.destroy();
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
     * @param {Function} callback
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
     * @param {Function} callback
     */
    this.onConnect = callback => bridge.onConnect(callback);
  }
}
