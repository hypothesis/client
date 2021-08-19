import { ListenerCollection } from './listener-collection';
import { isMessageEqual, SOURCE as source } from './port-util';

const MAX_WAIT_FOR_PORT = 1000 * 30;
const POLLING_INTERVAL_FOR_PORT = 500;

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./port-util').Message} Message
 * @typedef {Message['channel']} Channel
 * @typedef {Message['port']} Port
 */

/**
 * PortFinder class should be used in frames that are not the `host` frame. It
 * helps to discover `MessagePort` on a specific channel.
 *
 * Channel nomenclature is `[frame1]-[frame2]` so that:
 *   - `port1` should be owned by/transferred to `frame1`, and
 *   - `port2` should be owned by/transferred to `frame2`
 *
 * There should be the same amount of listener in this class as in PortProvider.
 *
 * @implements Destroyable
 */
export class PortFinder {
  constructor() {
    this._listeners = new ListenerCollection();
  }

  // Two important characteristics of `MessagePort`:
  // - it can only be used by one frame; the port is neutered if, after started to
  //   be used to receive messages, the port is transferred to a different frame.
  // - messages are queued until the other port is ready to listen (`port.start()`)

  /**
   * `guest-host` communication
   * @typedef {{channel: 'guest-host', hostFrame: Window, port: 'guest'}} options0
   *
   * `guest-sidebar` communication
   * @typedef {{channel: 'guest-sidebar', hostFrame: Window, port: 'guest'}} options1
   *
   * `host-sidebar` communication
   * @typedef {{channel: 'host-sidebar', hostFrame: Window, port: 'sidebar'}} options2
   *
   * `notebook-sidebar` communication
   * @typedef {{channel: 'notebook-sidebar', hostFrame: Window, port: 'notebook'}} options3
   *
   * @param {options0|options1|options2|options3} options
   * @return {Promise<MessagePort>}
   */
  discover(options) {
    const { channel, port } = options;
    return new Promise((resolve, reject) => {
      if (
        (channel === 'guest-host' && port === 'guest') ||
        (channel === 'guest-sidebar' && port === 'guest') ||
        (channel === 'host-sidebar' && port === 'sidebar') ||
        (channel === 'notebook-sidebar' && port === 'notebook')
      ) {
        this._requestPort({
          ...options,
          reject,
          resolve,
        });
        return;
      }

      reject(new Error('Invalid request of channel/port'));
    });
  }

  /**
   * @typedef RequestPortOptions
   * @prop {Channel} channel - requested channel
   * @prop {Window} hostFrame - the frame where the hypothesis client is loaded.
   *   It is used to send a `window.postMessage`.
   * @prop {Port} port - requested port
   * @prop {(reason: Error) => void} reject - execute the `Promise.reject` in case
   *   the `host` frame takes too long to answer the request.
   * @prop {(port: MessagePort) => void} resolve - execute the `Promise.resolve`
   *   when `host` frame successfully answers the request.
   */

  /**
   * Register a listener for the port `offer` and sends a request for one port.
   *
   * @param {RequestPortOptions} options
   */
  _requestPort({ channel, hostFrame, port, reject, resolve }) {
    function postRequest() {
      hostFrame.postMessage({ channel, port, source, type: 'request' }, '*');
    }

    const intervalId = window.setInterval(
      () => postRequest(),
      POLLING_INTERVAL_FOR_PORT
    );

    // The `host` frame maybe busy, that's why we should wait.
    const timeoutId = window.setTimeout(() => {
      clearInterval(intervalId);
      reject(
        new Error(`Unable to find '${port}' port on '${channel}' channel`)
      );
    }, MAX_WAIT_FOR_PORT);

    // TODO: It would be nice to remove the listener after receiving the port.
    this._listeners.add(window, 'message', event =>
      this._handlePortOffer(/** @type {MessageEvent} */ (event), {
        intervalId,
        message: { channel, port, source, type: 'offer' },
        resolve,
        timeoutId,
      })
    );

    postRequest();
  }

  /**
   * Resolve with a MessagePort when the `offer` message matches.
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
    if (isMessageEqual(data, message)) {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
      resolve(ports[0]);
    }
  }

  destroy() {
    this._listeners.removeAll();
  }
}
