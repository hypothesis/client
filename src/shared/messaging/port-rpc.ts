import { ListenerCollection } from '@hypothesis/frontend-shared';

import type { Destroyable } from '../../types/annotator';

/*
  This module was adapted from `index.js` in https://github.com/substack/frame-rpc.

  This software is released under the MIT license:

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
 */

const VERSION = '1.0.0';
const PROTOCOL = 'frame-rpc';

/**
 * Format of messages sent between frames.
 *
 * See https://github.com/substack/frame-rpc#protocol
 */
type RequestMessage = {
  arguments: unknown[];
  method: string;
  protocol: typeof PROTOCOL;
  sequence: number;
  version: typeof VERSION;
};

type ResponseMessage = {
  arguments: unknown[];
  protocol: typeof PROTOCOL;
  response: number;
  version: typeof VERSION;
};

type Message = RequestMessage | ResponseMessage;

function makeRequestMessage(
  method: string,
  args: unknown[] = [],
  sequence = -1,
): RequestMessage {
  return {
    protocol: PROTOCOL,
    version: VERSION,
    arguments: args,
    method,
    sequence,
  };
}

/**
 * Send a PortRPC method call.
 *
 * @param [sequence] - Sequence number used for replies
 */
function sendCall(
  port: MessagePort,
  method: string,
  args: unknown[] = [],
  sequence = -1,
) {
  port.postMessage(makeRequestMessage(method, args, sequence));
}

/**
 * Callback type used for RPC method handlers and result callbacks.
 */
type Callback = (...args: unknown[]) => void;

function isCallback(value: any): value is Callback {
  return typeof value === 'function';
}

export type CallMap = Record<string, (...args: any) => void>;
export type HandlerMap = Record<string, (...args: any) => void>;

/**
 * PortRPC provides remote procedure calls between frames or workers. It uses
 * the Channel Messaging API [1] as a transport.
 *
 * To communicate between two frames with this class, construct a PortRPC
 * instance in each and register method handlers with {@link on}. Create a
 * {@link MessageChannel} and send one of its two ports to each frame. Then call
 * {@link connect} to make the PortRPC instance in each frame use the corresponding
 * port.
 *
 * In addition to the custom methods that a PortRPC handles, there are several
 * built-in handlers which are invoked automatically:
 *
 * - "connect" is sent when a PortRPC connects to a port. This event can
 *   be used to confirm that the sending frame has received the port and will
 *   send a "close" event when it goes away.
 * - "close" is sent when a PortRPC is destroyed or the owning frame is
 *   unloaded. This event may not be dispatched if the guest frame terminates
 *   abnormally (eg. due to an OS process crash).
 *
 * [1] https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API
 *
 * @template Handlers - Object type describing the calls handled by this port,
 *   using {@link PortRPC.on}.
 * @template Calls - Object type describing the calls made by this port,
 *   using {@link PortRPC.prototype.call}.
 */
export class PortRPC<Handlers extends HandlerMap, Calls extends CallMap>
  implements Destroyable
{
  /**
   * Map of sequence number to response callback, for RPC calls sent from
   * this instance.
   */
  private _callbacks: Map<number, Callback>;

  private _destroyed: boolean;
  private _listeners: ListenerCollection;

  /** Map of method name to handler for RPC calls received by this instance. */
  private _methods: Map<keyof Handlers, Callback>;

  /** The underlying communication channel. */
  private _port: MessagePort | null;

  /** Sequence number for next call. */
  private _sequence: number;

  /**
   * Method and arguments of pending RPC calls made before a port was connected.
   */
  private _pendingCalls: Array<[keyof Calls, unknown[]]>;

  private _receivedCloseEvent: boolean;

  constructor({
    currentWindow = window,
    forceUnloadListener = false,
  }: {
    currentWindow?: Window;

    // Test seam. Force the use of a Window "unload" listener even if the
    // browser supports "close" events for MessagePort.
    forceUnloadListener?: boolean;
  } = {}) {
    this._port = null;
    this._methods = new Map();
    this._sequence = 1;
    this._callbacks = new Map();

    this._listeners = new ListenerCollection();

    // In browsers that emit a "close" event when the other end of a MessagePort
    // goes away, we can listen for that directly. In other browsers, we have to
    // send the "close" event through the message channel when the window
    // containing the sending port is unloaded.
    if (!('onclose' in MessagePort.prototype) || forceUnloadListener) {
      this._listeners.add(currentWindow, 'unload', event => {
        // Ignore custom events which use the same name. This works around an
        // issue in VitalSource.
        //
        // See https://github.com/hypothesis/support/issues/161#issuecomment-2454560641.
        if (event instanceof CustomEvent) {
          return;
        }

        if (this._port) {
          // Send "close" notification. This works in Chrome, Firefox and Safari
          // >= 16.
          sendCall(this._port, 'close');
        }
      });
    }

    this._pendingCalls = [];

    this._destroyed = false;
    this._receivedCloseEvent = false;
  }

  /**
   * Register a method handler for incoming RPC requests.
   *
   * The arguments to the handler will be the arguments passed to {@link call}
   * plus a final callback arg that can be used to return results to the caller.
   *
   * This can also be used to register a handler for the built-in "connect"
   * and "close" events.
   *
   * All handlers must be registered before {@link connect} is invoked.
   */
  on<M extends keyof Handlers>(method: M, handler: Handlers[M]) {
    if (this._port) {
      throw new Error('Cannot add a method handler after a port is connected');
    }
    this._methods.set(method, handler);
  }

  /**
   * Connect to a MessagePort and process any queued RPC requests.
   */
  connect(port: MessagePort) {
    this._port = port;
    this._listeners.add(port, 'message', event => this._handle(event));

    // For browsers that support a `close` event for MessagePort, we use that
    // to identify when the other end disconnects. This is translated into a
    // message event that is similar to what we receive in older browsers
    // which use a Window unload handler instead.
    this._listeners.add(port, 'close', () => {
      port.dispatchEvent(
        new MessageEvent('message', {
          data: makeRequestMessage('close'),
        }),
      );
    });

    port.start();
    sendCall(port, 'connect');

    for (const [method, args] of this._pendingCalls) {
      this.call(method, ...(args as Parameters<Calls[keyof Calls]>));
    }
    this._pendingCalls = [];
  }

  /**
   * Disconnect the RPC channel and close the MessagePort.
   */
  destroy() {
    if (this._port) {
      sendCall(this._port, 'close');
      this._port.close();
    }
    this._destroyed = true;
    this._listeners.removeAll();
  }

  /**
   * Send an RPC request via the connected port.
   *
   * If this client is not yet connected to a port, the call will be queued and
   * sent when {@link connect} is called.
   *
   * If the final argument in `args` is a function, it is treated as a callback
   * which is invoked with the response in the form of (error, result) arguments.
   */
  call<M extends keyof Calls>(method: M, ...args: Parameters<Calls[M]>) {
    if (!this._port) {
      this._pendingCalls.push([method, args]);
    }

    if (!this._port || this._destroyed) {
      return;
    }

    const seq = this._sequence++;
    const finalArg = args[args.length - 1];
    if (isCallback(finalArg)) {
      this._callbacks.set(seq, finalArg);
      args = args.slice(0, -1) as Parameters<Calls[M]>;
    }

    sendCall(this._port, method as string, args, seq);
  }

  /**
   * Validate message
   */
  private _parseMessage({ data }: MessageEvent): Message | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    if (data.protocol !== PROTOCOL) {
      return null;
    }
    if (data.version !== VERSION) {
      return null;
    }
    if (!Array.isArray(data.arguments)) {
      return null;
    }

    return data;
  }

  private _handle(event: MessageEvent) {
    const msg = this._parseMessage(event);
    const port = this._port;

    if (!msg || !port) {
      return;
    }

    if ('method' in msg) {
      // Only allow close event to fire once.
      if (msg.method === 'close') {
        if (this._receivedCloseEvent) {
          return;
        } else {
          this._receivedCloseEvent = true;
        }
      }

      const handler = this._methods.get(msg.method);
      if (!handler) {
        return;
      }

      const callback = (...args: unknown[]) => {
        const message: ResponseMessage = {
          arguments: args,
          protocol: PROTOCOL,
          response: msg.sequence,
          version: VERSION,
        };

        port.postMessage(message);
      };
      handler(...msg.arguments, callback);
    } else if ('response' in msg) {
      const cb = this._callbacks.get(msg.response);
      this._callbacks.delete(msg.response);
      if (cb) {
        cb(...msg.arguments);
      }
    }
  }
}
