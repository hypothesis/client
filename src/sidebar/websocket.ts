import { TinyEmitter } from 'tiny-emitter';

// Status codes indicating the reason why a WebSocket connection closed.
// See https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent and
// https://tools.ietf.org/html/rfc6455#section-7.4.

// "Normal" closures.
export const CLOSE_NORMAL = 1000;
export const CLOSE_GOING_AWAY = 1001;

// "Abnormal" closures.
export const CLOSE_ABNORMAL = 1006;

// There are other possible close status codes not listed here. They are all
// considered abnormal closures.

/**
 * Socket is a minimal wrapper around {@link WebSocket} which provides:
 *
 * - Serialization of JSON messages (see {@link send})
 * - An EventEmitter API
 * - Queuing of messages passed to send() whilst the socket is
 *   connecting
 */
export class Socket extends TinyEmitter {
  private _socket: WebSocket;

  /** Queue of JSON objects which have not yet been submitted. */
  private _messageQueue: object[];

  /**
   * Connect to the WebSocket endpoint at `url`.
   */
  constructor(url: string) {
    super();

    this._messageQueue = [];

    this._socket = new WebSocket(url);
    this._socket.onopen = event => {
      this.sendMessages();
      this.emit('open', event);
    };
    this._socket.onclose = event => {
      if (event.code === CLOSE_NORMAL || event.code === CLOSE_GOING_AWAY) {
        this.emit('close', event);
        return;
      }
      const err = new Error(`WebSocket closed abnormally, code: ${event.code}`);
      console.warn(err);
      this.emit('disconnect');
    };
    this._socket.onerror = event => {
      this.emit('error', event);
    };
    this._socket.onmessage = event => {
      this.emit('message', event);
    };
  }

  /** Close the underlying WebSocket connection */
  close() {
    // nb. Always sent a status code in the `close()` call to work around
    // a problem in the backend's ws4py library.
    //
    // If no status code is provided in the `close()` call, the browser will
    // send a close frame with no payload, which is allowed by the spec.
    // ws4py however, will respond by sending back a close frame with a 1005
    // status code, which is not allowed by the spec. What ws4py should do in
    // that scenario is send back a close frame with no payload itself. This
    // invalid close frame causes browsers to report an abnormal WS
    // termination, even though nothing really went wrong.
    //
    // To avoid the problem, we just explicitly send a "closed normally"
    // status code here and ws4py will respond with the same status.
    this._socket.close(CLOSE_NORMAL);
  }

  /**
   * Send a JSON object via the WebSocket connection, or queue it
   * for later delivery if not currently connected.
   */
  send(message: object) {
    this._messageQueue.push(message);
    if (this.isConnected()) {
      this.sendMessages();
    }
  }

  /** Returns true if the WebSocket is currently connected. */
  isConnected() {
    return this._socket.readyState === WebSocket.OPEN;
  }

  private sendMessages() {
    while (this._messageQueue.length > 0) {
      const messageString = JSON.stringify(this._messageQueue.shift());
      this._socket.send(messageString);
    }
  }
}
