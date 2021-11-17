import { TinyEmitter } from 'tiny-emitter';

import { ListenerCollection } from './listener-collection';
import { isMessageEqual, isSourceWindow } from './port-util';

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./port-util').Message} Message
 * @typedef {import('./port-util').Frame} Frame
 * @typedef {'guest-host'|'guest-sidebar'|'notebook-sidebar'|'sidebar-host'} Channel
 */

/**
 * PortProvider creates a `MessageChannel` for communication between two
 * frames.
 *
 * There are 4 types of frames:
 * - `host`: frame where the Hypothesis client is initially loaded.
 * - `guest`: frames with annotatable content. In some instances a `guest`
 *    frame can be the same as the `host` frame, in other cases, it is an iframe
 *    where either (1) the hypothesis client has been injected or (2) the
 *    hypothesis client has been configured to act exclusively as a `guest` (not
 *    showing the sidebar).
 * - `notebook`: another hypothesis app that runs in a separate iframe.
 * - `sidebar`: the main hypothesis app. It runs in an iframe on a different
 *    origin than the host and is responsible for the communication with the
 *    backend (fetching and saving annotations).
 *
 * This layout represents the current arrangement of frames:
 *
 * `host` frame
 * |-> `sidebar` iframe
 * |-> `notebook` iframe
 * |-> [`guest` iframes]
 *
 * Currently, we support communication between the following pairs of frames:
 * - `guest-host`
 * - `guest-sidebar`
 * - `notebook-sidebar`
 * - `sidebar-host`
 *
 * `PortProvider` is used only in the `host` frame. The other frames use the
 * companion class, `PortFinder`. `PortProvider` creates a `MessageChannel`
 * for two frames to communicate with each other. It also listens to requests for
 * particular `MessagePort` and dispatches the corresponding `MessagePort`.
 *
 *
 *        PortFinder (non-host frame)                 |       PortProvider (host frame)
 * -----------------------------------------------------------------------------------------------
 * 1. Request `MessagePort` via `window.postMessage` ---> 2. Receive request and create port pair
 *                                                                          |
 *                                                                          V
 * 4. Receive requested port      <---------------------- 3. Send first port to requesting frame
 *                                                        5. Send second port to other frame
 *                                                           (eg. via MessageChannel connection
 *                                                           between host and other frame)
 *
 * @implements Destroyable
 */
export class PortProvider {
  /**
   * @param {string} hypothesisAppsOrigin - the origin of the hypothesis apps
   *   is use to send the notebook and sidebar ports to only the frames that
   *   match the origin.
   */
  constructor(hypothesisAppsOrigin) {
    this._hypothesisAppsOrigin = hypothesisAppsOrigin;
    this._emitter = new TinyEmitter();

    // Although some channels (v.gr. `notebook-sidebar`) have only one
    // `MessageChannel`, other channels (v.gr. `guest-sidebar`) can have multiple
    // `MessageChannel`s. The `Window` refers to the frame that sends the initial
    // request that triggers creation of a channel.
    /** @type {Map<Channel, Map<Window, MessageChannel>>} */
    this._channels = new Map();

    // Two important characteristics of `MessagePort`:
    // - Once created, a MessagePort can only be transferred to a different
    //   frame once, and if any frame attempts to transfer it again it gets
    //   neutered.
    // - Messages are queued until the other port is ready to listen (`port.start()`)

    // Create the `sidebar-host` channel immediately, while other channels are
    // created on demand
    this._sidebarHostChannel = new MessageChannel();

    this._listeners = new ListenerCollection();

    /** @type {Array<Message & {allowedOrigin: string}>} */
    this._allowedMessages = [
      {
        allowedOrigin: '*',
        frame1: 'guest',
        frame2: 'host',
        type: 'request',
      },
      {
        allowedOrigin: '*',
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
      },
      {
        allowedOrigin: this._hypothesisAppsOrigin,
        frame1: 'sidebar',
        frame2: 'host',
        type: 'request',
      },
      {
        allowedOrigin: this._hypothesisAppsOrigin,
        frame1: 'notebook',
        frame2: 'sidebar',
        type: 'request',
      },
    ];
  }

  /**
   * Check that data and origin matches the expected values.
   *
   * @param {object} options
   *   @param {Message} options.allowedMessage - the `data` must match this
   *     `Message`.
   *   @param {string} options.allowedOrigin - the `origin` must match this
   *     value. If `allowedOrigin` is '*', the origin is ignored.
   *   @param {any} options.data - the data to be compared with `allowedMessage`.
   *   @param {string} options.origin - the origin to be compared with
   *     `allowedOrigin`.
   */
  _messageMatches({ allowedMessage, allowedOrigin, data, origin }) {
    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return false;
    }

    return isMessageEqual(data, allowedMessage);
  }

  /**
   * Send a message and a port to the corresponding destinations.
   *
   * @param {object} options
   *   @param {Channel} options.channel - communication channel enabled by this
   *     port.
   *   @param {Message} options.message - the message to be sent.
   *   @param {string} options.origin - the target origin to be used for sending
   *     the port.
   *   @param {Window} options.source - the frame to be used for sending the port.
   *   @param {MessagePort} options.port1 - the port to be sent.
   *   @param {MessagePort} [options.port2] - if a counterpart port is provided,
   *     send this port either, (1) to the `sidebar` frame using the `sidebar-host`
   *     channel or (2) through the `onHostPortRequest` event listener.
   */
  _sendPorts({ channel, message, origin, source, port1, port2 }) {
    source.postMessage(message, origin, [port1]);

    if (!port2) {
      return;
    }

    if (['notebook-sidebar', 'guest-sidebar'].includes(channel)) {
      this._sidebarHostChannel.port2.postMessage(message, [port2]);
    }

    if (channel === 'guest-host' && message.frame1 === 'guest') {
      this._emitter.emit('hostPortRequest', message.frame1, port2);
    }
  }

  /**
   * @param {'hostPortRequest'} eventName
   * @param {(source: 'guest', port: MessagePort) => void} handler - this handler
   *   fires when a request for the 'guest-host' channel is listened.
   */
  on(eventName, handler) {
    this._emitter.on(eventName, handler);
  }

  /**
   * Returns the `host` port from the `sidebar-host` channel.
   */
  get sidebarPort() {
    return this._sidebarHostChannel.port2;
  }

  /**
   * Initiate the listener of port requests by other frames.
   */
  listen() {
    this._listeners.add(window, 'message', messageEvent => {
      const { data, origin, source } = /** @type {MessageEvent} */ (
        messageEvent
      );

      if (!isSourceWindow(source)) {
        return;
      }

      const match = this._allowedMessages.find(
        ({ allowedOrigin, ...allowedMessage }) =>
          this._messageMatches({
            allowedMessage,
            allowedOrigin,
            data,
            origin,
          })
      );

      if (match === undefined) {
        return;
      }

      const { frame1, frame2 } = match;
      const channel = /** @type {Channel} */ (`${frame1}-${frame2}`);

      let windowChannelMap = this._channels.get(channel);
      if (!windowChannelMap) {
        windowChannelMap = new Map();
        this._channels.set(channel, windowChannelMap);
      }

      let messageChannel = windowChannelMap.get(source);

      // Ignore the port request if the channel for the specified window has
      // already been created. This is to avoid transferring the port more than once.
      if (messageChannel) {
        return;
      }

      /** @type {Message} */
      const message = { frame1, frame2, type: 'offer' };
      const options = { channel, message, origin, source };

      // `sidebar-host` channel is an special case, because it is created in the
      // constructor.
      if (channel === 'sidebar-host') {
        windowChannelMap.set(source, this._sidebarHostChannel);
        this._sendPorts({
          port1: this._sidebarHostChannel.port1,
          ...options,
        });
        return;
      }

      messageChannel = new MessageChannel();
      windowChannelMap.set(source, messageChannel);

      const { port1, port2 } = messageChannel;
      this._sendPorts({ port1, port2, ...options });
    });
  }

  destroy() {
    this._listeners.removeAll();
  }
}
