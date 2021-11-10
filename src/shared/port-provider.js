import { TinyEmitter } from 'tiny-emitter';

import { ListenerCollection } from './listener-collection';
import { isMessageEqual } from './port-util';

/**
 * @typedef {import('../types/config').SidebarConfig} SidebarConfig
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./port-util').Message} Message
 * @typedef {Message['channel']} Channel
 * @typedef {Message['port']} Port
 */

/**
 * PortProvider creates a `MessageChannel` for the communication between two
 * frames.
 *
 * There are 4 types of frames:
 * - `host`: frame where the hypothesis client is initially loaded.
 * - `guest/s`: frame/s with annotatable content. In some instances the `guest`
 *    frame can be the same as the `host` frame, in other cases, it is an iframe
 *    where either (1) the hypothesis client has been injected or (2) the
 *    hypothesis client has been configured to act exclusively as a `guest` (not
 *    showing the sidebar).
 * - `notebook`: it is an another hypothesis app that runs on a separate iframe.
 * - `sidebar`: the main hypothesis app. It runs on an iframe on a different
 *    origin than the host and is responsible for the communication with the
 *    backend (fetching and saving annotations).
 *
 * This layout represents the current arrangement of frames:
 *
 * `host` frame
 * |-> `sidebar` iframe
 * |-> `notebook` iframe
 * |-> [`guest` iframe/s]
 *
 * Currently, we support the communication between the following pair of frames:
 * - `guest-host`
 * - `guest-sidebar`
 * - `host-sidebar`
 * - `notebook-sidebar`
 *
 * `PortProvider` is used only in the `host` frame. The other frames use the
 * companion class, `PortFinder`. `PortProvider` creates a `MessageChannel`
 * for two frames to communicate with each other. It also listens to requests for
 * particular `MessagePort` and dispatches the corresponding `MessagePort`.
 *
 *
 *                 PortProvider                                       |                PortFinder
 * -------------------------------------------------------------------|------------------------------------------------------
 *
 * 2. listens to requests of `MessagePort` <---------------------------- 1. request a `MessagePort` using `window#postMessage`
 *                 |
 *                 V
 * 3. sends offers of `MessagePort` using `event#source#postMessage` ---> 4. listens to offers of `MessagePort`
 *                 |
 *                 V
 * 5. send reciprocal port to the `sidebar` frame using the `host-sidebar`
 *
 * Channel nomenclature is `[frame1]-[frame2]` so that:
 *   - `port1` should be owned by/transferred to `frame1`, and
 *   - `port2` should be owned by/transferred to `frame2`
 *
 * @implements Destroyable
 */

/*
 * In some situations, because `guest` iframe/s load in parallel to the `host`
 * frame, we can not assume that the code in the `host` frame is executed before
 * the code in a `guest` frame. Hence, we can't assume that `PortProvider` (in
 * the `host` frame) is initialized before `PortFinder` (in the `guest` frame).
 * Therefore, for the `PortFinder`, we implement a polling strategy (sending a
 * message every N milliseconds) until a response is received.
 *
 * Two important characteristics of `MessagePort`:
 * - it can only be used by one frame: in Chrome the port is neutered if transferred twice
 * - messages are queued until the other port is ready to listen (`port.start()`)
 */

export class PortProvider {
  /**
   * @param {string} hypothesisAppsOrigin - the origin of the hypothesis apps
   *   is use to send the notebook and sidebar ports to only the frames that
   *   matches the origin.
   */
  constructor(hypothesisAppsOrigin) {
    this._hypothesisAppsOrigin = hypothesisAppsOrigin;
    this._emitter = new TinyEmitter();

    // Although some channels (v.gr. `notebook-sidebar`) have only one
    // `MessageChannel`, other channels (v.gr. `guest-sidebar`) can have multiple
    // `MessageChannel`s. In spite of the number channel, we store all
    // `MessageChannel` on a `Map<Window, MessageChannel>`. The `Window` refers
    // to the frame that sends the initial request that triggers creation of a
    // channel.
    /** @type {Map<Channel, Map<Window, MessageChannel>>} */
    this._channels = new Map();

    // Create the `host-sidebar` channel immediately, while other channels are
    // created on demand
    this._hostSidebarChannel = new MessageChannel();

    this._listeners = new ListenerCollection();
  }

  /**
   * Checks the `postMessage` origin and message.
   *
   * @param {MessageEvent} event
   * @param {Message} allowedMessage - the MessageEvent's data must match this
   *   object to grant the port.
   * @param {string} allowedOrigin - the MessageEvent's origin must match this
   *   value to grant the port. If '*' allow all origins.
   */
  _isValidRequest(event, allowedMessage, allowedOrigin) {
    const { data, origin, source } = event;
    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return false;
    }

    if (
      // `source` can be of type Window | MessagePort | ServiceWorker.
      // The simple check `source instanceof Window`` doesn't work here.
      // Alternatively, `source` could be casted `/** @type{Window} */ (source)`
      !source ||
      source instanceof MessagePort ||
      source instanceof ServiceWorker
    ) {
      return false;
    }

    if (!isMessageEqual(data, allowedMessage)) {
      return false;
    }

    return true;
  }

  /**
   * Send a message and a port to the corresponding destinations.
   *
   * @param {MessageEvent} event
   * @param {Message} message - the message to be sent.
   * @param {MessagePort} port - the port to be sent via `window#postMessage`
   *   (the origin is set to match the MessageEvent's origin)frame that sends the initial request th
   * @param {MessagePort} [reciprocalPort] - if a reciprocal port is provided,
   *   send this port (1) to the `sidebar` frame using the `host-sidebar`
   *   channel or (2) through the `onHostPortRequest` event listener.
   */
  _sendPort(event, message, port, reciprocalPort) {
    const source = /** @type {Window} */ (event.source);

    source.postMessage(message, event.origin, [port]);

    if (reciprocalPort) {
      if (['notebook-sidebar', 'guest-sidebar'].includes(message.channel)) {
        this._hostSidebarChannel.port1.postMessage(message, [reciprocalPort]);
      }
      if (message.channel === 'guest-host' && message.port === 'guest') {
        this._emitter.emit('hostPortRequest', reciprocalPort, message.port);
      }
    }
  }

  /**
   * @param {'hostPortRequest'} eventName
   * @param {(MessagePort, channel: 'guest') => void} handler - this handler
   *   fires when a request for the 'guest-host' channel is listened.
   */
  on(eventName, handler) {
    this._emitter.on(eventName, handler);
  }

  /**
   * Returns a port from a channel. Currently, only returns the `host` port from
   * the `host-Sidebar` channel. Otherwise, it returns `null`.
   *
   * @param {object} options
   *   @param {'host-sidebar'} options.channel
   *   @param {'host'} options.port
   */
  getPort({ channel, port }) {
    if (channel === 'host-sidebar' && port === 'host') {
      return this._hostSidebarChannel.port1;
    }

    return null;
  }

  /**
   * Initiate the listener of port requests by other frames.
   */
  listen() {
    this._listeners.add(window, 'message', messageEvent => {
      const event = /** @type {MessageEvent} */ (messageEvent);
      /** @type {Array<{allowedOrigin: string, channel: Channel, port: Port}>} */
      ([
        {
          allowedOrigin: '*',
          channel: 'guest-host',
          port: 'guest',
        },
        {
          allowedOrigin: '*',
          channel: 'guest-sidebar',
          port: 'guest',
        },
        {
          allowedOrigin: this._hypothesisAppsOrigin,
          channel: 'host-sidebar',
          port: 'sidebar',
        },
        {
          allowedOrigin: this._hypothesisAppsOrigin,
          channel: 'notebook-sidebar',
          port: 'notebook',
        },
      ]).forEach(({ allowedOrigin, channel, port }) => {
        /** @type {Message} */
        const allowedMessage = {
          channel,
          port,
          source: 'hypothesis',
          type: 'request',
        };

        if (!this._isValidRequest(event, allowedMessage, allowedOrigin)) {
          return;
        }

        let windowChannelMap = this._channels.get(channel);
        if (!windowChannelMap) {
          windowChannelMap = new Map();
          this._channels.set(channel, windowChannelMap);
        }

        const eventSource = /** @type {Window} */ (event.source);
        let messageChannel = windowChannelMap.get(eventSource);

        // Ignore the port request if the channel for the specified window has
        // already been created. This is to avoid transfer the port more than once.
        if (messageChannel) {
          return;
        }

        /** @type {Message} */
        const message = { ...allowedMessage, type: 'offer' };

        // `host-sidebar` channel is an special case, because it is created in the
        // constructor.
        if (channel === 'host-sidebar') {
          windowChannelMap.set(eventSource, this._hostSidebarChannel);
          this._sendPort(event, message, this._hostSidebarChannel.port2);
          return;
        }

        messageChannel = new MessageChannel();
        windowChannelMap.set(eventSource, messageChannel);

        const { port1, port2 } = messageChannel;
        this._sendPort(event, message, port1, port2);
      });
    });
  }

  destroy() {
    this._listeners.removeAll();
  }
}
