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
const PROTOCOL = 'frame-rpc';

/**
 * Format of messages sent between frames.
 *
 * See https://github.com/substack/frame-rpc#protocol
 *
 * @typedef RequestMessage
 * @prop {any[]} arguments
 * @prop {string} method
 * @prop {PROTOCOL} protocol
 * @prop {number} sequence
 * @prop {VERSION} version
 *
 * @typedef ResponseMessage
 * @prop {any[]} arguments
 * @prop {PROTOCOL} protocol
 * @prop {number} response
 * @prop {VERSION} version
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
   * Create an RPC client for sending RPC requests from `sourceFrame` to
   * `destFrame`, and receiving RPC responses from `destFrame` to `sourceFrame`.
   *
   * This class has been adapted to work with `MessageChannel`. Because messages
   * sent through `MessageChannel` are only transmitted to and from `port1` and
   * `port2`, there is no need for `sourceFrame` and `origin` properties.
   *
   * TODO: July 2021, currently this class is a bit of a _frankenstein_ because
   * we support both `Window.postMessage` and `MessagePort.postMessage`.
   * Once we move all the inter-frame communication to `MessageChannel` we will
   * be able to cleanup this class. We have added `deprecated` comments in
   * the pieces of code that need to be removed.
   *
   * @param {Window} sourceFrame -- deprecated - Remove after MessagePort conversion
   * @param {Window|MessagePort} destFrameOrPort
   * @param {string} origin - Origin of destination frame (deprecated - Remove after MessagePort conversion)
   * @param {Record<string, (...args: any[]) => void>} methods - Map of method
   *   name to method handler
   */
  constructor(sourceFrame, destFrameOrPort, origin, methods) {
    this.sourceFrame = sourceFrame; // sourceFrame is ignored if using MessagePort

    if (destFrameOrPort instanceof MessagePort) {
      this._port = destFrameOrPort;
    } else {
      /** @deprecated */
      this.destFrame = destFrameOrPort;
    }

    // Deprecated - Remove after MessagePort conversion
    if (origin === '*') {
      this.origin = '*';
    } else {
      this.origin = new URL(origin).origin;
    }

    this._methods = methods;

    this._sequence = 0;
    this._callbacks = {};
    this._destroyed = false;

    this._listeners = new ListenerCollection();

    if (this._port) {
      this._listeners.add(this._port, 'message', event =>
        this._handle(/** @type {MessageEvent} */ (event))
      );
      this._port.start();
    } else {
      // Deprecated - Remove after MessagePort conversion
      /**
       * @param {MessageEvent} event
       * @deprecated
       */
      const onmessage = event => {
        if (!this._isValidSender(event)) {
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
    this._port?.close();
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
    const finalArg = args[args.length - 1];
    if (typeof finalArg === 'function') {
      this._callbacks[seq] = finalArg;
      args = args.slice(0, -1);
    }

    /** @type {RequestMessage} */
    const message = {
      arguments: args,
      method,
      protocol: PROTOCOL,
      sequence: seq,
      version: VERSION,
    };

    if (this._port) {
      this._port.postMessage(message);
    }

    // Deprecated - Remove after MessagePort conversion
    if (this.destFrame) {
      this.destFrame.postMessage(message, this.origin);
    }
  }

  /**
   * Validate sender
   *
   * @param {MessageEvent} event
   * @deprecated
   */
  _isValidSender(event) {
    if (event.source !== this.destFrame) {
      return false;
    }
    if (this.origin !== '*' && event.origin !== this.origin) {
      return false;
    }

    return true;
  }

  /**
   * Validate message
   *
   * @param {MessageEvent} event
   * @return {null|Message}
   */
  _parseMessage({ data }) {
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

  /**
   * @param {MessageEvent} event
   */
  _handle(event) {
    const msg = this._parseMessage(event);

    if (msg === null) {
      return;
    }

    if ('method' in msg) {
      if (!this._methods.hasOwnProperty(msg.method)) {
        return;
      }

      /** @param {any[]} args */
      const callback = (...args) => {
        /** @type {ResponseMessage} */
        const message = {
          arguments: args,
          protocol: PROTOCOL,
          response: msg.sequence,
          version: VERSION,
        };

        if (this._port) {
          this._port.postMessage(message);
        }

        // Deprecated - Remove after MessagePort conversion
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
