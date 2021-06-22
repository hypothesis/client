import { ListenerCollection } from './util/listener-collection';

/**
 * @typedef {import('../types/config').SidebarConfig} SidebarConfig
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 *
 * @typedef Message
 * @prop {'guestToSidebar'|'hostToSidebar'|'notebookToSidebar'} channel
 * @prop {'guest'|'host'|'notebook'|'sidebar'} port
 * @prop {'offer'|'request'}  type
 *
 * @typedef {Message & {source: 'hypothesis'}} MessageSourced
 */

// Because there are many `postMessages` in the wild, this PREFIX helps to
// identify the provenance and avoids the chances of cross-communication
const SOURCE = 'hypothesis';

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
 * - `sidebar`: the main hypothesis app. It runs on an iframe and is generally
 *    shadow DOMed. It is responsible for communicating with the backend,
 *    fetching and saving the annotations.
 * - `notebook`: it is an another hypothesis app. It runs on an iframe and is
 *    generally shadow DOMed.
 * - `guest/s`: iframes with annotatable content
 *
 * This layout represents the current arrangement of frames:
 *
 * `host` frame
 * |-> (generally, shadow DOMed) `sidebar` iframe
 * |-> (generally, shadow DOMed) `notebook` iframe
 * |-> [`guest` iframe/s]
 *     |-> [`guest` iframe/s]
 *
 * Currently, we support the communication between the following pair of frames:
 * - `guest` <-> `sidebar` TODO
 * - `host` <-> `sidebar` TODO
 * - `notebook` <-> `sidebar`
 *
 * `FrameConnector` runs only on the `host` frame. The rest of the frames run the
 * companion class, `PortFinder`. `FrameConnector` creates `MessageChannels` for
 * two frames to communicate with each other. It also listens to requests for
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
 * TODO: after `hostToSidebar` channel has been established, it would be recommended
 * in step #3 to substitute `frame.postMessage` by
 * `hostToSidebar(channel).sidebar(port).postMessage`.
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
    // `[frame1]To[frame2]` so that `port1` should be owned by/sent to
    // `frame1` and `port2` by `frame2`.
    this._channels = {
      /**
       * Channels for the `guest` frame/s are created on demand (we don't know how
       * many of those would be).
       *
       * @type {Array<{subFrameIdentifier: string, channel: MessageChannel}>}
       */
      guestToSidebar: [], // TODO
      hostToSidebar: new MessageChannel(), // TODO
      notebookToSidebar: new MessageChannel(),
    };

    this._listeners = new ListenerCollection();
  }

  /**
   * Returns a port from a channel. Currently, only returns the `host` port from
   * the `hostToSidebar` channel. Otherwise, it returns `null`.
   *
   * @param {object} options
   *   @param {'hostToSidebar'} options.channel
   *   @param {'host'} options.port
   */
  getPort({ channel, port }) {
    if (channel === 'hostToSidebar' && port === 'host') {
      return this._channels.hostToSidebar.port1;
    }

    return null;
  }

  listen() {
    // Listen and respond to the request of the `sidebar` port from `hostToSidebar` channel
    this._listeners.add(window, 'message', event =>
      this._handleMessage(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        message: {
          channel: 'hostToSidebar',
          port: 'sidebar',
          type: 'request',
        },
        port: this._channels.hostToSidebar.port2,
      })
    );

    // Listen and respond to the request of the `notebook` port from `notebookToSidebar` channel
    this._listeners.add(window, 'message', event =>
      this._handleMessage(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        message: {
          channel: 'notebookToSidebar',
          port: 'notebook',
          type: 'request',
        },
        port: this._channels.notebookToSidebar.port1,
      })
    );

    // Listen and respond to the request of the `sidebar` port from `notebookToSidebar` channel
    // TODO: this listener is not required, if the `sidebarPort` is sent through the `hostToSidebar` channel.
    this._listeners.add(window, 'message', event =>
      this._handleMessage(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        message: {
          channel: 'notebookToSidebar',
          port: 'sidebar',
          type: 'request',
        },
        port: this._channels.notebookToSidebar.port2,
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
  _handleMessage({ data, origin, source }, { allowedOrigin, message, port }) {
    if (origin === allowedOrigin) {
      const parsedData = parseMessage(data);
      if (
        !(source instanceof MessagePort) &&
        !(source instanceof ServiceWorker) &&
        parsedData
      ) {
        if (equalMessage(parsedData, message)) {
          source?.postMessage(
            createMessage({
              channel: message.channel,
              port: message.port,
              type: 'offer',
            }),
            allowedOrigin,
            [port]
          );
        }
      }
    }
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
 * `notebookToSidebar` channel (not the `sidebar` port).
 *
 * Two important characteristics of `MessagePorts`:
 * - can only use by one pair of frames; ports are neutered if try to be used by a different frames
 * - message are queued until the other port is ready to listen
 *
 * There should be the same amount of listener in this class as in FrameConnect.
 *
 * @implements Destroyable
 */
export class PortFinder {
  constructor() {
    this._listeners = new ListenerCollection();
  }

  /**
   * guest <-> sidebar TODO
   * polling necessary because the `guest` frame could be loaded before the `host` frame
   * @typedef {{channel: 'guestToSidebar', hostFrame: Window, port: 'guest', subFrameIdentifier: string}} options0
   *
   * host <-> sidebar
   * @typedef {{channel: 'hostToSidebar', hostFrame: Window, port: 'sidebar'}} options1
   *
   * notebook <-> sidebar
   * @typedef {{channel: 'notebookToSidebar', hostFrame: Window, port: 'notebook'}} options2
    // TODO: this listener is not required, if the `sidebarPort` is sent through the `hostToSidebar` channel.
   * @typedef {{channel: 'notebookToSidebar', hostFrame: Window, port: 'sidebar'}} options3
   *
   * @param {options0|options1|options2|options3} options
   * @return {Promise<MessagePort>}
   */
  discover(options) {
    return new Promise((resolve, reject) => {
      // `host` <-> `sidebar` communication
      if (options.channel === 'hostToSidebar' && options.port === 'sidebar') {
        this._requestPortAndListenForAnswer({ ...options, reject, resolve });
        return;
      }

      // `notebook` <-> `sidebar` communication
      if (
        options.channel === 'notebookToSidebar' &&
        options.port === 'notebook'
      ) {
        this._requestPortAndListenForAnswer({ ...options, reject, resolve });
        return;
      }

      // TODO: this is not necessary, we can use
      if (
        options.channel === 'notebookToSidebar' &&
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
   *   @param {string} [options.subFrameIdentifier] -- TODO: `subFrameIdentifier`
   *   will be useful to prevent the `FrameConnector` from create duplicated ports
   *   for the same guest frame.
   */
  _requestPortAndListenForAnswer({
    channel,
    hostFrame,
    port,
    reject,
    resolve,
    // @ts-ignore
    // eslint-disable-next-line no-unused-vars
    subFrameIdentifier,
  }) {
    // The resolution of the promise is guaranteed, however, as defensive
    // programming technique, it's better to reject the request after
    // certain amount of time (30s).
    const timeoutId = window.setTimeout(
      () => reject(new Error(`Unable to find '${port} port on ${channel}`)),
      1000 * 30
    );

    this._listeners.add(window, 'message', event =>
      this._handleMessage(/** @type {MessageEvent} */ (event), {
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
  _handleMessage({ data, ports }, { message, resolve, timeoutId }) {
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
