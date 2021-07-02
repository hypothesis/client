import { ListenerCollection } from '../annotator/util/listener-collection';

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

/**
 * Format of messages sent between frames.
 *
 * See https://github.com/substack/frame-rpc#protocol
 *
 * @typedef RequestMessage
 * @prop {number} sequence
 * @prop {string} method
 * @prop {any[]} arguments
 *
 * @typedef ResponseMessage
 * @prop {number} response
 * @prop {any[]} arguments
 *
 * @typedef {RequestMessage|ResponseMessage} Message
 *
 * @typedef {import('../types/annotator').Destroyable} Destroyable
 */

/**
 * Class for making RPC requests between two frames.
 *
 * Code adapted from https://github.com/substack/frame-rpc.
 *
 * @implements Destroyable
 */
export class RPC {
  /**
   * Create an RPC client for sending RPC messages from `sourceFrame` to
   * `destFrame`, and receiving RPC messages from `destFrame` to `sourceFrame`.
   *
   * This class has been adapted to work with `MessageChannel`. Because
   * `MessageChannel` are unidirectional we ignore the `sourceFrame` and `origin`
   * properties, in this case.
   *
   * @param {Window} sourceFrame
   * @param {Window|MessagePort} destFrameOrPort
   * @param {string} origin - Origin of destination frame
   * @param {Record<string, (...args: any[]) => void>} methods - Map of method
   *   name to method handler
   */
  constructor(sourceFrame, destFrameOrPort, origin, methods) {
    this.sourceFrame = sourceFrame; // sourceFrame is ignored if using MessagePort

    if (destFrameOrPort instanceof MessagePort) {
      this._port = destFrameOrPort;
    } else {
      this.destFrame = destFrameOrPort;
    }

    if (origin === '*') {
      this.origin = '*';
    } else {
      this.origin = new URL(origin).origin;
    }

    this._methods = methods;

    this._sequence = 0;
    this._callbacks = {};

    this._listeners = new ListenerCollection();

    if (this._port) {
      this._listeners.add(this._port, 'message', event =>
        this._handle(/** @type {MessageEvent} */ (event))
      );
      this._port.start();
    } else {
      /** @param {MessageEvent} event */
      const onmessage = event => {
        if (!this._isValidSender) {
          return;
        }
        this._handle(event);
      };
      this._listeners.add(this.sourceFrame, 'message', event =>
        onmessage(/** @type {MessageEvent} */ (event))
      );
    }
  }

  /**
   * Disconnect the RPC channel. After this is invoked no further method calls
   * will be received.
   */
  destroy() {
    this._destroyed = true;
    this._listeners.removeAll();
  }

  /**
   * Send an RPC request to the destination frame.
   *
   * If the final argument in `args` is a function, it is treated as a callback
   * which is invoked with the response.
   *
   * @param {string} method
   * @param {any[]} args
   */
  call(method, ...args) {
    if (this._destroyed) {
      return;
    }

    const seq = this._sequence++;
    if (typeof args[args.length - 1] === 'function') {
      this._callbacks[seq] = args[args.length - 1];
      args = args.slice(0, -1);
    }

    const message = {
      protocol: 'frame-rpc',
      version: VERSION,
      sequence: seq,
      method,
      arguments: args,
    };

    if (this._port) {
      this._port.postMessage(message);
    }
    if (this.destFrame) {
      this.destFrame.postMessage(message, this.origin);
    }
  }

  /**
   * Validate sender
   *
   * @param {MessageEvent} event
   */
  _isValidSender(event) {
    if (
      this._destroyed ||
      this.destFrame !== event.source ||
      (this.origin !== '*' && event.origin !== this.origin)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Validate message
   *
   * @param {MessageEvent} event
   */
  _isValidMessage({ data }) {
    if (
      this._destroyed ||
      !data ||
      typeof data !== 'object' ||
      data.protocol !== 'frame-rpc' ||
      !Array.isArray(data.arguments)
    ) {
      return false;
    }

    return true;
  }

  /**
   * @param {MessageEvent} event
   */
  _handle(event) {
    if (!this._isValidMessage(event)) {
      return;
    }

    const msg = /** @type {Message} */ (event.data);

    if ('method' in msg) {
      if (!this._methods.hasOwnProperty(msg.method)) {
        return;
      }

      /** @param {any[]} args */
      const callback = (...args) => {
        const message = {
          protocol: 'frame-rpc',
          version: VERSION,
          response: msg.sequence,
          arguments: args,
        };

        if (this._port) {
          this._port.postMessage(message);
        }

        if (this.destFrame) {
          this.destFrame.postMessage(message, this.origin);
        }
      };
      this._methods[msg.method].call(this._methods, ...msg.arguments, callback);
    } else if ('response' in msg) {
      const cb = this._callbacks[msg.response];
      delete this._callbacks[msg.response];
      if (cb) {
        cb.apply(null, msg.arguments);
      }
    }
  }
}
