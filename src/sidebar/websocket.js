import retry from 'retry';
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
const RECONNECT_MIN_DELAY = 1000;

/**
 * Socket is a minimal wrapper around WebSocket which provides:
 *
 * - Automatic reconnection in the event of an abnormal close
 * - Queuing of messages passed to send() whilst the socket is
 *   connecting
 * - Uses the standard EventEmitter API for reporting open, close, error
 *   and message events.
 */
export default class Socket extends TinyEmitter {
  constructor(url) {
    super();

    const self = this;

    // queue of JSON objects which have not yet been submitted
    const messageQueue = [];

    // the current WebSocket instance
    let socket;

    // a pending operation to connect a WebSocket
    let operation;

    function sendMessages() {
      while (messageQueue.length > 0) {
        const messageString = JSON.stringify(messageQueue.shift());
        socket.send(messageString);
      }
    }

    // Connect the websocket immediately. If a connection attempt is already in
    // progress, do nothing.
    function connect() {
      if (operation) {
        return;
      }

      operation = retry.operation({
        minTimeout: RECONNECT_MIN_DELAY * 2,
        // Don't retry forever -- fail permanently after 10 retries
        retries: 10,
        // Randomize retry times to minimise the thundering herd effect
        randomize: true,
      });

      operation.attempt(function () {
        socket = new WebSocket(url);
        socket.onopen = function (event) {
          onOpen();
          self.emit('open', event);
        };
        socket.onclose = function (event) {
          if (event.code === CLOSE_NORMAL || event.code === CLOSE_GOING_AWAY) {
            self.emit('close', event);
            return;
          }
          const err = new Error(
            'WebSocket closed abnormally, code: ' + event.code
          );
          console.warn(err);
          onAbnormalClose(err);
        };
        socket.onerror = function (event) {
          self.emit('error', event);
        };
        socket.onmessage = function (event) {
          self.emit('message', event);
        };
      });
    }

    // onOpen is called when a websocket connection is successfully established.
    function onOpen() {
      operation = null;
      sendMessages();
    }

    // onAbnormalClose is called when a websocket connection closes abnormally.
    // This may be the result of a failure to connect, or an abnormal close after
    // a previous successful connection.
    function onAbnormalClose(error) {
      // If we're already in a reconnection loop, trigger a retry...
      if (operation) {
        if (!operation.retry(error)) {
          console.error(
            'reached max retries attempting to reconnect websocket'
          );
        }
        return;
      }
      // ...otherwise reconnect the websocket after a short delay.
      let delay = RECONNECT_MIN_DELAY;
      delay += Math.floor(Math.random() * delay);
      operation = setTimeout(function () {
        operation = null;
        connect();
      }, delay);
    }

    /** Close the underlying WebSocket connection */
    this.close = function () {
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
      socket.close(CLOSE_NORMAL);
    };

    /**
     * Send a JSON object via the WebSocket connection, or queue it
     * for later delivery if not currently connected.
     */
    this.send = function (message) {
      messageQueue.push(message);
      if (this.isConnected()) {
        sendMessages();
      }
    };

    /** Returns true if the WebSocket is currently connected. */
    this.isConnected = function () {
      return socket.readyState === WebSocket.OPEN;
    };

    connect();
  }
}
