import type { Destroyable } from '../../types/annotator';
import { ListenerCollection } from '../listener-collection';
import { generateHexString } from '../random';
import { isMessageEqual } from './port-util';
import type { Frame } from './port-util';

/** Timeout for waiting for the host frame to respond to a port request. */
export const MAX_WAIT_FOR_PORT = 1000 * 20;

/** Polling interval for requests to the host frame for a port. */
export const POLLING_INTERVAL_FOR_PORT = 250;

export type Options = {
  /** The role of this frame. */
  source: Exclude<Frame, 'host'>;

  /** Identifier for this frame. */
  sourceId?: string;

  /** The frame where the `PortProvider` is listening for messages. */
  hostFrame: Window;
};

/**
 * PortFinder is used by non-host frames in the client to establish a
 * MessagePort-based connection to other frames. It is used together with
 * PortProvider which runs in the host frame. See PortProvider for an overview.
 */
export class PortFinder implements Destroyable {
  private _hostFrame: Window;
  private _listeners: ListenerCollection;
  private _source: Exclude<Frame, 'host'>;
  private _sourceId: string | undefined;

  constructor({ hostFrame, source, sourceId }: Options) {
    this._hostFrame = hostFrame;
    this._source = source;
    this._sourceId = sourceId;
    this._listeners = new ListenerCollection();
  }

  destroy() {
    this._listeners.removeAll();
  }

  /**
   * Request a specific port from the host frame
   *
   * @param target - the frame aiming to be discovered
   */
  async discover(target: Frame): Promise<MessagePort> {
    let isValidRequest = false;
    if (
      (this._source === 'guest' && target === 'host') ||
      (this._source === 'guest' && target === 'sidebar') ||
      (this._source === 'sidebar' && target === 'host') ||
      (this._source === 'notebook' && target === 'sidebar')
    ) {
      isValidRequest = true;
    }

    if (!isValidRequest) {
      throw new Error('Invalid request of channel/port');
    }

    const requestId = generateHexString(6);

    return new Promise((resolve, reject) => {
      const postRequest = () => {
        this._hostFrame.postMessage(
          {
            frame1: this._source,
            frame2: target,
            type: 'request',
            requestId,
            sourceId: this._sourceId,
          },
          '*',
        );
      };

      // Because `guest` iframes load in parallel to the `host` frame, we can
      // not assume that the code in the `host` frame is executed before the
      // code in a `guest` frame. Hence, we can't assume that `PortProvider` (in
      // the `host` frame) is initialized before `PortFinder` (in the non-host
      // frames). Therefore, for the `PortFinder`, we implement a polling
      // strategy (sending a message every N milliseconds) until a response is
      // received.
      const intervalId = setInterval(postRequest, POLLING_INTERVAL_FOR_PORT);

      // The `host` frame maybe busy, that's why we should wait.
      const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        reject(
          new Error(
            `Unable to establish ${this._source}-${target} communication channel`,
          ),
        );
      }, MAX_WAIT_FOR_PORT);

      const listenerId = this._listeners.add(window, 'message', event => {
        const { data, ports } = event;
        if (
          isMessageEqual(data, {
            frame1: this._source,
            frame2: target,
            type: 'offer',
            requestId,
          })
        ) {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          this._listeners.remove(listenerId);
          resolve(ports[0]);
        }
      });

      postRequest();
    });
  }
}
