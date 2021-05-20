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
 * Class for making RPC requests between frames.
 *
 * Code adapted from https://github.com/substack/frame-rpc.
 *
 * @implements Destroyable
 */
export class RPC {
  /**
   * Create an RPC client for sending RPC requests from `sourceFrame` to
   * `destFrame`.
   *
   * @param {Window} sourceFrame
   * @param {Window} destFrame
   * @param {string} origin - Origin of destination frame
   * @param {Record<string, (...args: any[]) => any>} methods - Map of method
   *   name to method handler
   */
  constructor(sourceFrame, destFrame, origin, methods) {
    this.sourceFrame = sourceFrame;
    this.destFrame = destFrame;

    if (origin === '*') {
      this.origin = '*';
    } else {
      const url = new URL(origin);
      this.origin = url.protocol + '//' + url.host;
    }

    this._sequence = 0;
    this._callbacks = {};

    /** @param {MessageEvent} event */
    this._onmessage = event => {
      // Validate message sender and format.
      if (
        this._destroyed ||
        this.destFrame !== event.source ||
        (this.origin !== '*' && event.origin !== this.origin) ||
        !event.data ||
        typeof event.data !== 'object' ||
        event.data.protocol !== 'frame-rpc' ||
        !Array.isArray(event.data.arguments)
      ) {
        return;
      }
      this._handle(event.data);
    };
    this.sourceFrame.addEventListener('message', this._onmessage);
    this._methods = methods;
  }

  /**
   * Disconnect the RPC channel. After this is invoked no further method calls
   * will be received.
   */
  destroy() {
    this._destroyed = true;
    this.sourceFrame.removeEventListener('message', this._onmessage);
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
    this.destFrame.postMessage(
      {
        protocol: 'frame-rpc',
        version: VERSION,
        sequence: seq,
        method: method,
        arguments: args,
      },
      this.origin
    );
  }

  /**
   * @param {Message} msg
   */
  _handle(msg) {
    if (this._destroyed) {
      return;
    }
    if ('method' in msg) {
      if (!this._methods.hasOwnProperty(msg.method)) {
        return;
      }
      /** @param {any[]} args */
      const callback = (...args) => {
        this.destFrame.postMessage(
          {
            protocol: 'frame-rpc',
            version: VERSION,
            response: msg.sequence,
            arguments: args,
          },
          this.origin
        );
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
