import { ListenerCollection } from '../annotator/util/listener-collection';

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

// Because there are many `postMessages` on the `host` frame, the SOURCE property
// is added to the hypothesis `postMessages` to identify the provenance of the
// message and avoid listening to messages that could have the same properties
// but different source. This is not a is not a security feature but an
// anti-collision mechanism.
const SOURCE = 'hypothesis';

const MAX_WAIT_FOR_PORT = 1000 * 5;
const MAX_WAIT_FOR_GUEST_PORT = 1000 * 30;
const POLLING_FOR_GUEST_PORT_INTERVAL = 500;

/**
 * Utility to insert the `source` property into the `postMessage`.
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
 * It checks if the `postMessage` has all the expected properties, including the
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
 * it returns the message without the `source` property, otherwise, it returns
 * `null`.
 *
 * @param {any} message
 * @return {null|Message}
 */
export function parseMessage(message) {
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
 * - `host`:  frame where the hypothesis client is initially loaded
 * - `sidebar`: the main hypothesis app. It runs on an iframe and is responsible
 *    for communicating with the backend, fetching and saving annotations.
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
 * - `guest` <-> `sidebar`
 * - `host` <-> `sidebar`
 * - `notebook` <-> `sidebar`
 *
 * `FrameConnector` runs only on the `host` frame. The rest of the frames run the
 * companion class, `PortFinder`. `FrameConnector` creates a `MessageChannel`
 * for two frames to communicate with each other. It also listens to requests for
 * particular channel.port and dispatches the corresponding `MessagePort`.
 *
 *
 *                 FrameConnector                      |                PortFinder
 * ----------------------------------------------------|-------------------------------------------------------------------
 *
 * 2. listens to `requests` of channel.port <--------------------- 1. `request` a channel.port using `hostFrame.postMessage`
 *                 |
 *                 V
 * 3. sends `offers` of channel.port using `frame.postMessage` ---> 4. listens to `offers` of channel.port
 *                 |
 *                 V
 * 5. send reciprocal port to the `sidebar` frame using its
 *    `hostToSidebar(channel).sideba(port)`
 *
 *
 * It is essential that `FrameConnect` initialize the listeners (step 2) before
 * `PortFinder` sends the `requests` of channel.port (step 1). Because the
 * `host` frame creates the `sidebar` and `notebook` iframes, under normal load
 *  conditions, it is guaranteed that `host` frame is ready to listen to messages
 *  originating from the `sidebar` and `notebook` iframes.
 *
 * However, the above assumption is not true for the `guest` frames. Because
 * `guest` iframes load in parallel to the `host` frame, we can not assume that
 * the code in the `host`frame is executed before the code in a `guest` frame.
 * Therefore, for the `guest` frames we implement a polling strategy (sending a
 * message every N milliseconds until a response is received).
 *
 *
 * @implements Destroyable
 */
export class FrameConnector {
  /**
   *   @param {string} sidebarAppUrl
   */
  constructor(sidebarAppUrl) {
    this._sidebarAndNotebookAppOrigin = new URL(sidebarAppUrl).origin;

    // Create only the necessary channels. Channel nomenclature:
    // `[frame1]To[frame2]` so that `port1` should be owned by/transferred to
    // `frame1` and `port2` to `frame2`.
    this._channels = {
      /**
       * Channels for the `guest` frame/s are created on demand (we don't know how
       * many would be).
       *
       * @type {Map<Window,MessageChannel>}
       */
      guestToSidebar: new Map(),
      hostToSidebar: new MessageChannel(),
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
    // TODO: It would be nice to remove the listener after sending the port.

    // `guest` <-> `sidebar` communication
    this._listeners.add(window, 'message', event =>
      this._handleGuestPortRequest(/** @type {MessageEvent} */ (event), {
        allowedOrigin: '*',
        allowedMessage: {
          channel: 'guestToSidebar',
          port: 'guest',
          type: 'request',
        },
      })
    );

    // `host` <-> `sidebar` communication
    this._listeners.add(window, 'message', event =>
      this._handlePortRequest(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        allowedMessage: {
          channel: 'hostToSidebar',
          port: 'sidebar',
          type: 'request',
        },
        port: this._channels.hostToSidebar.port2,
      })
    );

    // `notebook` <-> `sidebar` communication
    this._listeners.add(window, 'message', event =>
      this._handlePortRequest(/** @type {MessageEvent} */ (event), {
        allowedOrigin: this._sidebarAndNotebookAppOrigin,
        allowedMessage: {
          channel: 'notebookToSidebar',
          port: 'notebook',
          type: 'request',
        },
        port: this._channels.notebookToSidebar.port1,
        reciprocalPort: this._channels.notebookToSidebar.port2,
      })
    );
  }

  /**
   * @typedef Options
   * @prop {string} allowedOrigin - the origin in the `MessageEvent` that is
   *   allowed. If '*' allow every origin
   * @prop {Message} allowedMessage - the message type that is allowed
   * @prop {MessagePort} port - the port to be transferred to the frame.
   * @prop {MessagePort} [reciprocalPort] - the reciprocalPort
   *   is transferred to the `sidebar` frame using the `sidebar` port o
   */

  /**
   * Checks the `postMessage` origin and message.
   *
   * @param {MessageEvent} event
   * @param {Omit<Options, 'port'>} options
   */
  _isValidRequest({ data, origin, source }, { allowedOrigin, allowedMessage }) {
    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return false;
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
      return false;
    }

    const parsedData = parseMessage(data);
    if (!parsedData || !equalMessage(parsedData, allowedMessage)) {
      return false;
    }

    return true;
  }

  /**
   * It sends (1) the requested port via `frame.postMessage` (the origin is set
   * to match the allowedOrigin) and (2) the reciprocal port, if one is provided,
   * to the `sidebar` frame using `hostToSidebar(channel).sidebar(port).postMessage`
   *
   * @param {MessageEvent} event
   * @param {Options} options
   */
  _sendPort(event, { allowedMessage, port, reciprocalPort }) {
    const messageSource = createMessage({
      channel: allowedMessage.channel,
      port: allowedMessage.port,
      type: 'offer',
    });

    const source = /** @type {Window} */ (event.source);

    source.postMessage(messageSource, event.origin, [port]);

    if (reciprocalPort) {
      this._channels.hostToSidebar.port1.postMessage(messageSource, [
        reciprocalPort,
      ]);
    }
  }

  /**
   * Respond to `request` of ports on channels other than the `guestToSidebar`
   * (which is a special case, see below).
   *
   * @param {MessageEvent} event
   * @param {Options} options
   */
  _handlePortRequest(event, options) {
    if (!this._isValidRequest(event, options)) {
      return;
    }

    this._sendPort(event, options);
  }

  /**
   * Respond to `request` of port in `guestToSidebar` channel. This ports are
   * created on demand, one per window.
   *
   * @param {MessageEvent} event
   * @param {Omit<Options, 'port'>} options
   */
  _handleGuestPortRequest(event, options) {
    if (!this._isValidRequest(event, options)) {
      return;
    }

    const source = /** @type {Window} */ (event.source);

    // Check if channel has already been created, if it does then ignore the
    // request because the port has already been sent.
    if (this._channels.guestToSidebar.has(window)) {
      return;
    }

    const { port1, port2 } = new MessageChannel();
    this._channels.guestToSidebar.set(source, { port1, port2 });

    this._sendPort(event, { ...options, port: port1, reciprocalPort: port2 });
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
   * `guest` <-> `sidebar` communication
   * @typedef {{channel: 'guestToSidebar', hostFrame: Window, port: 'guest'}} options0
   *
   * `host` <-> `sidebar` communication
   * @typedef {{channel: 'hostToSidebar', hostFrame: Window, port: 'sidebar'}} options1
   *
   * `notebook` <-> `sidebar` communication
   * @typedef {{channel: 'notebookToSidebar', hostFrame: Window, port: 'notebook'}} options2
   *
   * @param {options0|options1|options2} options
   * @return {Promise<MessagePort>}
   */
  discover(options) {
    return new Promise((resolve, reject) => {
      // `guest` <-> `sidebar` communication
      if (options.channel === 'guestToSidebar' && options.port === 'guest') {
        this._requestPortAndListenForAnswerWithPolling({
          ...options,
          reject,
          resolve,
        });
        return;
      }

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

      reject(new Error('Unknown channel or port'));
    });
  }

  /**
   *
   * @typedef RequestPortOptions
   * @prop {Message['channel']} channel - requested channel
   * @prop {Window} hostFrame - the frame where the hypothesis client is loaded.
   *   It is used to send a `hostFrame.postMessage`.
   * @prop {Message['port']} port - requested port
   * @prop {(reason?: any) => void} reject - execute the `Promise.reject` in case
   *   the `host` frame takes too long to answer the request.
   * @prop {(port: MessagePort) => void} resolve - execute the `Promise.resolve`
   *   when `host` frame successfully answers the request.
   */

  /**
   * Register a listener for the port `offer` and sends a request for one port.
   *
   * @param {RequestPortOptions} options
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
    // certain amount of time.
    const timeoutId = window.setTimeout(
      () =>
        reject(
          new Error(`Unable to find '${port}' port on '${channel}' channel`)
        ),
      MAX_WAIT_FOR_PORT
    );

    // TODO: It would be nice to remove the listener after sending the port.
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
   * Register a listener for the port `offer` and sends a request for one port.
   *
   * @param {RequestPortOptions} options
   */
  _requestPortAndListenForAnswerWithPolling({
    channel,
    hostFrame,
    port,
    reject,
    resolve,
  }) {
    // The `host` frame maybe busy loading heavy documents, that's why the
    // waiting period is longer before we reject the request.
    const timeoutId = window.setTimeout(
      () =>
        reject(
          new Error(`Unable to find '${port}' port on '${channel}' channel`)
        ),
      MAX_WAIT_FOR_GUEST_PORT
    );

    const intervalId = window.setInterval(() => 
      hostFrame.postMessage(
        createMessage({ channel, port, type: 'request' }),
        '*'
      )
    , POLLING_FOR_GUEST_PORT_INTERVAL);

    // TODO: It would be nice to remove the listener after sending the port.
    this._listeners.add(window, 'message', event =>
      this._handlePortOffer(/** @type {MessageEvent} */ (event), {
        message: { channel, port, type: 'offer' },
        resolve,
        timeoutId,
        intervalId,
      })
    );

    hostFrame.postMessage(
      createMessage({ channel, port, type: 'request' }),
      '*'
    );
  }

  /**
   * Respond to `offer` of channel.ports. It calls `Promise.resolve`.
   *
   * @param {MessageEvent} event
   * @param {object} options
   *   @param {Message} options.message
   *   @param {(port: MessagePort) => void} options.resolve
   *   @param {number} options.timeoutId
   *   @param {number} [options.intervalId]
   */
  _handlePortOffer(
    { data, ports },
    { message, resolve, timeoutId, intervalId }
  ) {
    const parsedData = parseMessage(data);
    if (parsedData && equalMessage(parsedData, message)) {
      window.clearTimeout(timeoutId);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      resolve(ports[0]);
    }
  }

  destroy() {
    this._listeners.removeAll();
  }
}
