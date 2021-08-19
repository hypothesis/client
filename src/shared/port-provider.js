import { ListenerCollection } from './listener-collection';
import { isMessageEqual, SOURCE as source } from './port-util';

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
 * `PortProvider` is used only on the `host` frame. The rest of the frames use the
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
 *
 * In some situations, because `guest` iframe/s load in parallel to the `host`
 * frame, we can not assume that the code in the `host` frame is executed before
 * the code in a `guest` frame. Hence, we can't assume that `PortProvider` (in
 * the `host` frame) is initialized before `PortFinder` (in the `guest` frame).
 * Therefore, for the `PortFinder`, we implement a polling strategy (sending a
 * message every N milliseconds) until a response is received.
 *
 * Channel nomenclature is `[frame1]-[frame2]` so that:
 *   - `port1` should be owned by/transferred to `frame1`, and
 *   - `port2` should be owned by/transferred to `frame2`
 *
 * @implements Destroyable
 */
export class PortProvider {
  /**
   * @param {string} hypothesisAppsURL
   */
  constructor(hypothesisAppsURL) {
    this._hypothesisAppsOrigin = new URL(hypothesisAppsURL).origin;

    // Although some channels (v.gr. `notebook-sidebar`) have only one
    // `MessageChannel`, other channels (v.gr. `guest-sidebar`) can have multiple
    // `MessageChannel`s. In spite of the number channel, we store all
    // `MessageChannel` on a `Map<Window, MessageChannel>`.
    /** @type {Map<Channel, Map<Window, MessageChannel>>} */
    this._channels = new Map();

    // Create the `host-sidebar` channel immediately, while other channels are
    // created on demand
    this._hostSidebarChannel = new MessageChannel();
    this._channels.set(
      'host-sidebar',
      new Map([[window, this._hostSidebarChannel]])
    );

    this._listeners = new ListenerCollection();
    this._listen();
  }

  /**
   * @param {'onHostPortRequest'} _eventName
   * @param {(MessagePort, channel: 'guest') => void} handler - this handler
   *   fires when a request for the 'guest-host' channel is listened.
   */
  addEventListener(_eventName, handler) {
    this._onHostPortRequest = handler;
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
  _listen() {
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
      this._listeners.add(window, 'message', event =>
        this._handlePortRequest(/** @type {MessageEvent} */ (event), {
          allowedMessage: {
            channel,
            port,
            source,
            type: 'request',
          },
          allowedOrigin,
        })
      );
    });
  }

  /**
   * @typedef Options
   * @prop {Message} allowedMessage - the request `MessageEvent` must match this
   *   object to grant the port.
   * @prop {string} allowedOrigin - the origin in the `MessageEvent` must match
   *   this value to grant the port. If '*' allow all origins.
   */

  /**
   * Checks the `postMessage` origin and message.
   *
   * @param {MessageEvent} event
   * @param {Options} options
   */
  _isValidRequest({ data, origin, source }, { allowedMessage, allowedOrigin }) {
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
   * Send (1) the requested port via `frame#postMessage` (the origin is set
   * to match the allowedOrigin) and (2) the reciprocal port, if one is provided,
   * to the `sidebar` frame using `host-sidebar(channel).host(port)#postMessage`
   *
   * @param {MessageEvent} event
   * @param {Options & {port: MessagePort, reciprocalPort? : MessagePort}} options
   */
  _sendPort(event, { allowedMessage, port, reciprocalPort }) {
    const message = { ...allowedMessage, type: 'offer' };

    const source = /** @type {Window} */ (event.source);

    source.postMessage(message, event.origin, [port]);

    if (reciprocalPort) {
      if (['notebook-sidebar', 'guest-sidebar'].includes(message.channel)) {
        this._hostSidebarChannel.port1.postMessage(message, [reciprocalPort]);
      }
      if (message.channel === 'guest-host' && message.port === 'guest') {
        this._onHostPortRequest?.(reciprocalPort, message.port);
      }
    }
  }

  /**
   * Respond to request of ports on channels.
   * @param {MessageEvent} event
   * @param {Options} options
   */
  _handlePortRequest(event, options) {
    if (!this._isValidRequest(event, options)) {
      return;
    }

    const { channel, port } = options.allowedMessage;

    // Check if channel has already been created. `host-sidebar` channel is an
    // special case, because is created in the constructor.
    if (channel === 'host-sidebar' && port === 'sidebar') {
      this._sendPort(event, {
        ...options,
        port: this._hostSidebarChannel.port2,
      });
      return;
    }

    let windowChannelMap = this._channels.get(channel);
    if (!windowChannelMap) {
      windowChannelMap = new Map();
      this._channels.set(channel, windowChannelMap);
    }

    const source = /** @type {Window} */ (event.source);
    let messageChannel = windowChannelMap.get(source);

    if (!messageChannel) {
      messageChannel = new MessageChannel();
      windowChannelMap.set(source, messageChannel);
    }

    const { port1, port2 } = messageChannel;
    this._sendPort(event, { ...options, port: port1, reciprocalPort: port2 });
  }

  destroy() {
    this._listeners.removeAll();
  }
}
