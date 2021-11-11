import { ListenerCollection } from './listener-collection';
import { isMessageEqual } from './port-util';

const MAX_WAIT_FOR_PORT = 1000 * 5;
const POLLING_INTERVAL_FOR_PORT = 250;

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./port-util').Message} Message
 * @typedef {Message['channel']} Channel
 * @typedef {Message['port']} Port
 */

/**
 * PortFinder is used by non-host frames in the client to establish a
 * MessagePort-based connection to other frames. It is used together with
 * PortProvider which runs in the host frame. See PortProvider for an overview.
 *
 * Channel nomenclature is `[frame1]-[frame2]` so that:
 *   - `port1` should be owned by/transferred to `frame1`, and
 *   - `port2` should be owned by/transferred to `frame2`
 *
 * @implements Destroyable
 */
export class PortFinder {
  constructor() {
    this._listeners = new ListenerCollection();
  }

  destroy() {
    this._listeners.removeAll();
  }

  /**
   * Request a specific port from `hostFrame`
   *
   * @param {object} options
   *   @param {Channel} options.channel - requested channel
   *   @param {Window} options.hostFrame - frame where the hypothesis client is
   *     loaded and `PortProvider` is listening for messages
   *   @param {Port} options.port - requested port
   * @return {Promise<MessagePort>}
   */
  async discover({ channel, hostFrame, port }) {
    let isValidRequest = false;
    if (
      (channel === 'guest-host' && port === 'guest') ||
      (channel === 'guest-sidebar' && port === 'guest') ||
      (channel === 'host-sidebar' && port === 'sidebar') ||
      (channel === 'notebook-sidebar' && port === 'notebook')
    ) {
      isValidRequest = true;
    }

    if (!isValidRequest) {
      throw new Error('Invalid request of channel/port');
    }

    return new Promise((resolve, reject) => {
      function postRequest() {
        hostFrame.postMessage(
          { channel, port, source: 'hypothesis', type: 'request' },
          '*'
        );
      }

      // In some situations, because `guest` iframe/s load in parallel to the `host`
      // frame, we can not assume that the code in the `host` frame is executed before
      // the code in a `guest` frame. Hence, we can't assume that `PortProvider` (in
      // the `host` frame) is initialized before `PortFinder` (in the non-host frames).
      // Therefore, for the `PortFinder`, we implement a polling strategy (sending a
      // message every N milliseconds) until a response is received.
      const intervalId = setInterval(postRequest, POLLING_INTERVAL_FOR_PORT);

      // The `host` frame maybe busy, that's why we should wait.
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject(
          new Error(`Unable to find '${port}' port on '${channel}' channel`)
        );
      }, MAX_WAIT_FOR_PORT);

      // TODO: It would be nice to remove the listener after receiving the port.
      this._listeners.add(window, 'message', event => {
        const { data, ports } = /** @type {MessageEvent} */ (event);
        if (
          isMessageEqual(data, {
            channel,
            port,
            source: 'hypothesis',
            type: 'offer',
          })
        ) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve(ports[0]);
        }
      });

      postRequest();
    });
  }
}
