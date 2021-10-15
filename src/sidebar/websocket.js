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

// Minimum delay, in ms, before reconnecting after an abnormal connection close.
export const RECONNECT_MIN_DELAY = 1000;

/**
 * Socket is a minimal wrapper around WebSocket which provides:
 *
 * - Automatic reconnection in the event of an abnormal close
 * - Queuing of messages passed to send() whilst the socket is
 *   connecting
 * - Uses the standard EventEmitter API for reporting open, close, error
 *   and message events.
 */
export class Socket extends TinyEmitter {
  /**
   * Initiate a WebSocket connection.
   *
   * @param {() => string|Promise<string>} getURL - Callback that returns the
   *   URL to connect to. This is invoked before the initial connection and
   *   before any automatic reconnection attempts.
   */
  constructor(getURL) {
    super();

    /**
     * Queue of JSON objects which have not yet been submitted
     *
     * @type {object[]}
     */
    const messageQueue = [];

    /**
     * The active `WebSocket` instance
     *
     * @type {WebSocket|null}
     */
    let socket = null;

    /**
     * Number of times the WebSocket has attempted to connect without success.
     * This is reset when a connection is successful.
     */
    let connectionAttempts = 0;

    const sendMessages = () => {
      while (socket?.readyState === WebSocket.OPEN && messageQueue.length > 0) {
        const messageString = JSON.stringify(messageQueue.shift());
        socket.send(messageString);
      }
    };

    /**
     * Connect the WebSocket.
     */
    const connect = async () => {
      ++connectionAttempts;

      const url = await getURL();
      socket = new WebSocket(url);
      socket.onopen = event => {
        connectionAttempts = 0;
        sendMessages();
        this.emit('open', event);
      };
      socket.onclose = event => {
        if (event.code === CLOSE_NORMAL || event.code === CLOSE_GOING_AWAY) {
          this.emit('close', event);
          return;
        }

        // If an "abnormal" disconnection occurs, attempt to reconnect
        // automatically.
        const err = new Error(
          `WebSocket closed abnormally, code: ${event.code}`
        );
        console.warn(err);

        if (connectionAttempts >= 10) {
          console.error(
            'Reached max retries attempting to reconnect WebSocket'
          );
          return;
        }

        // Backoff factor for reconnection. This uses an exponential backoff,
        // where the delay starts at `RECONNECT_MIN_DELAY` and then doubles on
        // each attempt.
        const delay = RECONNECT_MIN_DELAY * 2 ** (connectionAttempts - 1);
        setTimeout(connect, delay);
      };
      socket.onerror = event => {
        this.emit('error', event);
      };
      socket.onmessage = event => {
        this.emit('message', event);
      };
    };

    /** Close the underlying WebSocket connection */
    this.close = () => {
      // nb. Always send a status code in the `close()` call to work around
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
      socket?.close(CLOSE_NORMAL);
    };

    /**
     * Send a JSON object via the WebSocket connection, or queue it
     * for later delivery if not currently connected.
     *
     * @param {object} message
     */
    this.send = message => {
      messageQueue.push(message);
      sendMessages();
    };

    /** Returns true if the WebSocket is currently connected. */
    this.isConnected = () => {
      return socket?.readyState === WebSocket.OPEN;
    };

    connect();
  }
}
