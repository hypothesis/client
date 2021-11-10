import { ListenerCollection } from './listener-collection';
import { isMessageEqual } from './port-util';

const MAX_WAIT_FOR_PORT = 1000 * 30;
const POLLING_INTERVAL_FOR_PORT = 250;

/**
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 * @typedef {import('./port-util').Message} Message
 * @typedef {Message['channel']} Channel
 * @typedef {Message['port']} Port
 */

/**
 * PortFinder helps to discover `MessagePort` on a specific channel.
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

  destroy() {
    this._listeners.removeAll();
  }

  /**
   * Polls the hostFrame for a specific port and returns a Promise of the port.
   *
   * @param {object} options
   *   @param {Channel} options.channel - requested channel
   *   @param {Window} options.hostFrame - frame where the hypothesis client is
   *     loaded and `PortProvider` is listening for messages
   *   @param {Port} options.port - requested port
   * @return {Promise<MessagePort>}
   */
  discover({ channel, hostFrame, port }) {
    let isValidRequest = false;
    if (
      (channel === 'guest-host' && port === 'guest') ||
      (channel === 'guest-sidebar' && port === 'guest') ||
      (channel === 'host-sidebar' && port === 'sidebar') ||
      (channel === 'notebook-sidebar' && port === 'notebook')
    ) {
      isValidRequest = true;
    }

    return new Promise((resolve, reject) => {
      if (!isValidRequest) {
        reject(new Error('Invalid request of channel/port'));
        return;
      }

      function postRequest() {
        hostFrame.postMessage(
          { channel, port, source: 'hypothesis', type: 'request' },
          '*'
        );
      }

      const intervalId = setInterval(
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
