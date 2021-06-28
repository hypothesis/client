import { ListenerCollection } from '../annotator/util/listener-collection';

/**
 * @typedef {import('../types/config').SidebarConfig} SidebarConfig
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 *
 * @typedef Message
 * @prop {'guestToSidebarChannel'|'hostToSidebarChannel'|'notebookToSidebarChannel'} channel
 * @prop {'guest'|'notebook'|'sidebar'} port
 * @prop {'offer'|'request'}  type
 *
 * @typedef {Message & {source: 'hypothesis'}} MessageSourced
 */

// Because there are many `postMessages` on the `host` frame, the SOURCE property
// is added to the hypothesis `postMessages` to identify the provenance of the
// message and avoid listening to messages that could have same properties but
// different source. This is not a is not a security feature but an
// anti-collision mechanism.
const SOURCE = 'hypothesis';

const MAX_WAIT_FOR_PORT = 1000 * 5;

/**
 * Utility to insert the `source` property into the `postMessage`. There are two
 * types of messages: `offer` and `request` of a port from a channel.
 *
 * @param {Message} message
 * @return {MessageSourced}
 */
function createMessage({ channel, port, type }) {
  return {
    channel,
    port,
    source: SOURCE,
    type,
  };
}

/**
 * Checks if the `postMessage` has all the expected properties, including the
 * correct `source` property. If so it returns `true`, otherwise, `false`.
 *
 * @param {any} possibleMessage
 *
 * // This typescript guard doesn't seem to work
 * @return {possibleMessage is MessageSourced}
 */
function isMessageSourced(possibleMessage) {
  if (!possibleMessage || typeof possibleMessage !== 'object') {
    return false;
  }

  for (let property of ['channel', 'port', 'source', 'type']) {
    if (
      possibleMessage.hasOwnProperty(property) === false ||
      typeof possibleMessage[property] !== 'string'
    ) {
      return false;
    }
  }

  return possibleMessage.source === SOURCE;
}

/**
 * Utility to parse `postMessage`. If the `postMessage` is of type `MessageSourced`
 * it returns the message without the `source` property, otherwise, it returns `null`.
 *
 * @param {any} message
 * @return {null|Message}
 */
function parseMessage(message) {
  if (isMessageSourced(message) === false) {
    return null;
  }

  const { channel, port, type } = message;

  return {
    channel,
    port,
    type,
  };
}

/**
 * Compares two messages of type `Message`
 *
 * @param {Message} message1
 * @param {Message} message2
 */
function equalMessage(message1, message2) {
  return (
    JSON.stringify(message1, Object.keys(message1).sort()) ===
    JSON.stringify(message2, Object.keys(message2).sort())
  );
}

/**
 * FrameConnector creates `MessageChannel` for the communication between two
 * frames.
 *
 * There are 4 types of frames:
 * - `host`:  frame where the client is initially loaded
 * - `sidebar`: the main hypothesis app. It runs on an iframe and is responsible
 *    for communicating with the backend, fetching and saving the annotations.
 * - `notebook`: it is an another hypothesis app that runs on an iframe.
 * - `guest/s`: iframes with annotatable content
 *
 * This layout represents the current arrangement of frames:
 *
 * `host` frame
 * |-> `sidebar` iframe
 * |-> `notebook` iframe
 * |-> [`guest` iframe/s]
 *     |-> [`guest` iframe/s]
 *
 * Currently, we support the communication between the following pair of frames:
 * - `guest` <-> `sidebar` TODO
 * - `host` <-> `sidebar` TODO
 * - `notebook` <-> `sidebar`
 *
 * `FrameConnector` runs only on the `host` frame. The rest of the frames run the
 * companion class, `PortFinder`. `FrameConnector` creates a `MessageChannels`
 * for two frames to communicate with each other. It also listens to requests for
 * particular channel.port and dispatches the corresponding `MessagePort`.
 *
 *
 *                 FrameConnector                      |                PortFinder
 * ----------------------------------------------------|--------------------------------------------------------------
 *
 * 2. listens to `requests` of channel.port <--------------------- 1. `request` a channel.port using `host.postMessage`
 *                 |
 *                 V
 * 3. sends `offers` of channel.port using `frame.postMessage` ---> 4. listens to `offers` of channel.port
 *
 * TODO: after `hostToSidebarChannel` has been established, it would be recommended
 * in step #3 to substitute `frame.postMessage` for `sidebarPort.postMessage`
 * using `hostToSidebarChannel.sidebarPort`.
 *
 * It is essential that `FrameConnect` initialize the listeners (step #2) before
 * `PortFinder` sends the `requests` of channel.port (step #1). Because the
 * `host` frame creates the `sidebar` and `notebook` iframes, it is guaranteed
 * that `host` frame is ready to listen to messages originating from the
 * `sidebar` and `notebook` iframes.
 *
 * However, the above assumption is not true for `host` and `guest` frames. Because
 * `guest` iframes load in parallel, we can not assume that the code in the `host`
 * frame is executed before the code in a `guest` frame. Therefore, for the `guest`
 * frames we implement a polling strategy (sending a message every N milliseconds
 * until a response is received).
 *
 *
 * @implements Destroyable
 */
export class FrameConnector {
  /**
   * @param {object} options
   *   @param {string} options.sidebarAppUrl
   */
  constructor({ sidebarAppUrl }) {
    this._sidebarAndNotebookAppOrigin = new URL(sidebarAppUrl).origin;

    // Create only the necessary channels. Channel nomenclature:
    // `[frame1]To[frame2]Channel` so that `port1` should be owned by/sent to
    // `frame1` and `port2` by `frame2`.
    this._channels = {
      /**
       * Channels for the `guest` frame/s are created on demand (we don't know how
       * many of those would be).
       *
       * @type {Record<Window,MessageChannel>}
       */
      guestToSidebarChannel: {}, // TODO
      hostToSidebarChannel: new MessageChannel(), // TODO
      notebookToSidebarChannel: new MessageChannel(),
    };

    this._listeners = new ListenerCollection();
  }

  listen() {
    // Listen and respond to the request of the `notebook` port from `notebookToSidebarChannel`
    this._listeners.add(window, 'message', event =>
      this._handlePortRequest(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        message: {
          channel: 'notebookToSidebarChannel',
          port: 'notebook',
          type: 'request',
        },
        port: this._channels.notebookToSidebarChannel.port1,
      })
    );

    // Listen and respond to the request of the `sidebar` port from `notebookToSidebarChannel`
    // TODO: this listener is not required, if the `sidebarPort` is sent through the `hostToSidebarChannel.
    this._listeners.add(window, 'message', event =>
      this._handlePortRequest(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        message: {
          channel: 'notebookToSidebarChannel',
          port: 'sidebar',
          type: 'request',
        },
        port: this._channels.notebookToSidebarChannel.port2,
      })
    );
  }

  /**
   * Respond to `request` of channel.ports. It sends a `frame.postMessage` with
   * the port only if the frame's origin matches the the expected origin.
   *
   * It would be nicer to remove the listener after sending the port.
   *
   * @param {MessageEvent} event
   * @param {object} options
   *   @param {string} options.allowedOrigin
   *   @param {Message} options.message
   *   @param {MessagePort} options.port
   */
  _handlePortRequest(
    { data, origin, source },
    { allowedOrigin, message, port }
  ) {
    if (origin !== allowedOrigin) {
      return;
    }

    if (
      // `source` can be of type Window | MessagePort | ServiceWorker
      // The simple check `source instanceof Window`` doesn't work here, maybe
      // because the frame is from a different origin?
      // Alternatively, `source` could be casted `/** @type{Window} */ (source)`
      !source ||
      source instanceof MessagePort ||
      source instanceof ServiceWorker
    ) {
      return;
    }

    const parsedData = parseMessage(data);
    if (!parsedData || !equalMessage(parsedData, message)) {
      return;
    }

    source.postMessage(
      createMessage({
        channel: message.channel,
        port: message.port,
        type: 'offer',
      }),
      allowedOrigin,
      [port]
    );
  }

  destroy() {
    this._listeners.removeAll();
  }
}

/**
 * PortFinder class should be used in frames that are not the `host` frames. It
 * helps to discover `MessagePort` on a specific channel. The requested port
 * refers to the owners frame, not the frame to which the frame wants to communicate.
 * For example, the `notebook` frame should request the `notebook` port of the
 * `notebookToSidebarChannel` (not the `sidebar` port).
 *
 * There should be the same amount of listener in this class as in FrameConnect.
 *
 * @implements Destroyable
 */
export class PortFinder {
  constructor() {
    this._listeners = new ListenerCollection();
  }

  // Two important characteristics of `MessagePort`:
  // - it can only use by one frame; the port is neutered if, after started to
  //   be used to receive messages, the port is transferred to a different frame
  // - messages are queued until the other port is ready to listen (`port.start()`)

  /**
   * guest <-> sidebar TODO
   * polling necessary because the `guest` frame could be loaded before the `host` frame
   * @typedef {{channel: 'guestToSidebarChannel', hostFrame: Window, port: 'guest'}} options0
   *
   * host <-> sidebar TODO
   * @typedef {{channel: 'hostToSidebarChannel', hostFrame: Window, port: 'sidebar'}} options1
   *
   * notebook <-> sidebar
   * @typedef {{channel: 'notebookToSidebarChannel', hostFrame: Window, port: 'notebook'}} options2
    // TODO: this listener is not required, if the `sidebarPort` is sent through the `hostToSidebarChannel.
   * @typedef {{channel: 'notebookToSidebarChannel', hostFrame: Window, port: 'sidebar'}} options3
   *
   * @param {options0|options1|options2|options3} options
   * @return {Promise<MessagePort>}
   */
  // @ts-ignore TODO: s
  // eslint-disable-next-line no-unused-vars
  discover(options) {
    return new Promise((resolve, reject) => {
      if (
        options.channel === 'notebookToSidebarChannel' &&
        options.port === 'notebook'
      ) {
        this._requestPortAndListenForAnswer({ ...options, reject, resolve });
        return;
      }

      // TODO: this is not necessary, we can use
      if (
        options.channel === 'notebookToSidebarChannel' &&
        options.port === 'sidebar'
      ) {
        this._requestPortAndListenForAnswer({ ...options, reject, resolve });
        return;
      }

      reject(new Error('Unknown channel or port'));
    });
  }

  /**
   * Register a listener for the port `offer` and sends a request for one port.
   *
   * @param {object} options
   *   @param {Message['channel']} options.channel
   *   @param {Window} options.hostFrame
   *   @param {Message['port']} options.port
   *   @param {(reason?: any) => void} options.reject
   *   @param {(port: MessagePort) => void} options.resolve
   */
  _requestPortAndListenForAnswer({
    channel,
    hostFrame,
    port,
    reject,
    resolve,
  }) {
    // The resolution of the promise is guaranteed, however, as defensive
    // programming technique, it's better to reject the request after
    // certain amount of time (30s).
    const timeoutId = window.setTimeout(
      () =>
        reject(new Error(`Unable to find '${port} port on ${channel} channel`)),
      MAX_WAIT_FOR_PORT
    );

    this._listeners.add(window, 'message', event =>
      this._handlePortOffer(/** @type {MessageEvent} */ (event), {
        message: { channel, port, type: 'offer' },
        resolve,
        timeoutId,
      })
    );

    hostFrame.postMessage(
      createMessage({ channel, port, type: 'request' }),
      '*'
    );
  }

  /**
   * Respond to `offer` of channel.ports. It calls resolve on the Promise.
   *
   * @param {MessageEvent} event
   * @param {object} options
   *   @param {Message} options.message
   *   @param {(port: MessagePort) => void} options.resolve
   *   @param {number} options.timeoutId
   */
  _handlePortOffer({ data, ports }, { message, resolve, timeoutId }) {
    const parsedData = parseMessage(data);
    if (parsedData && equalMessage(parsedData, message)) {
      window.clearTimeout(timeoutId);
      resolve(ports[0]);
    }
  }

  destroy() {
    this._listeners.removeAll();
  }
}
