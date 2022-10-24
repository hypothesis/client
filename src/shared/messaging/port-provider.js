import { TinyEmitter } from 'tiny-emitter';

import { captureErrors, sendError } from '../frame-error-capture';
import { ListenerCollection } from '../listener-collection';
import { isMessage, isMessageEqual, isSourceWindow } from './port-util';

/**
 * @typedef {import('../../types/annotator').Destroyable} Destroyable
 * @typedef {import('./port-util').Message} Message
 * @typedef {import('./port-util').Frame} Frame
 * @typedef {'guest-host'|'guest-sidebar'|'notebook-sidebar'|'sidebar-host'} Channel
 */

/**
 * PortProvider creates a `MessageChannel` for communication between two
 * frames.
 *
 * There are 4 types of frames:
 * - `host`: frame where the Hypothesis client is initially loaded.
 * - `guest`: frames with annotatable content. In some instances a `guest`
 *    frame can be the same as the `host` frame, in other cases, it is an iframe
 *    where either (1) the hypothesis client has been injected or (2) the
 *    hypothesis client has been configured to act exclusively as a `guest` (not
 *    showing the sidebar).
 * - `notebook`: another hypothesis app that runs in a separate iframe.
 * - `sidebar`: the main hypothesis app. It runs in an iframe on a different
 *    origin than the host and is responsible for the communication with the
 *    backend (fetching and saving annotations).
 *
 * This layout represents the current arrangement of frames:
 *
 * `host` frame
 * |-> `sidebar` iframe
 * |-> `notebook` iframe
 * |-> [`guest` iframes]
 *
 * Currently, we support communication between the following pairs of frames:
 * - `guest-host`
 * - `guest-sidebar`
 * - `notebook-sidebar`
 * - `sidebar-host`
 *
 * `PortProvider` is used only in the `host` frame. The other frames use the
 * companion class, `PortFinder`. `PortProvider` creates a `MessageChannel`
 * for two frames to communicate with each other. It also listens to requests for
 * particular `MessagePort` and dispatches the corresponding `MessagePort`.
 *
 *
 *        PortFinder (non-host frame)                 |       PortProvider (host frame)
 * -----------------------------------------------------------------------------------------------
 * 1. Request `MessagePort` via `window.postMessage` ---> 2. Receive request and create port pair
 *                                                                          |
 *                                                                          V
 * 4. Receive requested port      <---------------------- 3. Send first port to requesting frame
 *                                                        5. Send second port to other frame
 *                                                           (eg. via MessageChannel connection
 *                                                           between host and other frame)
 *
 * @implements {Destroyable}
 */
export class PortProvider {
  /**
   * Begin listening to port requests from other frames.
   *
   * @param {string} hypothesisAppsOrigin - the origin of the hypothesis apps
   *   is use to send the notebook and sidebar ports to only the frames that
   *   match the origin.
   */
  constructor(hypothesisAppsOrigin) {
    this._hypothesisAppsOrigin = hypothesisAppsOrigin;
    this._emitter = new TinyEmitter();

    /**
     * IDs of port requests that have been handled.
     *
     * This is used to avoid responding to the same request multiple times.
     * Guest frames in particular may send duplicate requests (see comments in
     * PortFinder).
     *
     * @type {Set<string>}
     */
    this._handledRequests = new Set();

    // Create the `sidebar-host` channel immediately, while other channels are
    // created on demand
    this._sidebarHostChannel = new MessageChannel();

    this._listeners = new ListenerCollection();

    /** @type {Array<Partial<Message> & {allowedOrigin: string}>} */
    this._allowedMessages = [
      {
        allowedOrigin: '*',
        frame1: 'guest',
        frame2: 'host',
        type: 'request',
      },
      {
        allowedOrigin: '*',
        frame1: 'guest',
        frame2: 'sidebar',
        type: 'request',
      },
      {
        allowedOrigin: this._hypothesisAppsOrigin,
        frame1: 'sidebar',
        frame2: 'host',
        type: 'request',
      },
      {
        allowedOrigin: this._hypothesisAppsOrigin,
        frame1: 'notebook',
        frame2: 'sidebar',
        type: 'request',
      },
    ];

    this._listen();
  }

  _listen() {
    const errorContext = 'Handling port request';
    const sentErrors = /** @type {Set<string>} */ (new Set());

    /** @param {string} message */
    const reportError = message => {
      if (sentErrors.has(message)) {
        // PortFinder will send requests repeatedly until it gets a response or
        // a timeout is reached.
        //
        // Only send errors once to avoid spamming Sentry.
        return;
      }
      sentErrors.add(message);
      sendError(new Error(message), errorContext);
    };

    /** @param {MessageEvent} event */
    const handleRequest = event => {
      const { data, origin, source } = event;

      if (!isMessage(data) || data.type !== 'request') {
        // If this does not look like a message intended for us, ignore it.
        return;
      }

      const { frame1, frame2, requestId, sourceId } = data;
      const channel = /** @type {Channel} */ (`${frame1}-${frame2}`);

      if (!isSourceWindow(source)) {
        reportError(
          `Ignored port request for channel ${channel} from non-Window source`
        );
        return;
      }

      const match = this._allowedMessages.find(
        ({ allowedOrigin, ...allowedMessage }) =>
          this._messageMatches({
            allowedMessage,
            allowedOrigin,
            data,
            origin,
          })
      );

      if (match === undefined) {
        reportError(
          `Ignored invalid port request for channel ${channel} from ${origin}`
        );
        return;
      }

      if (this._handledRequests.has(requestId)) {
        return;
      }
      this._handledRequests.add(requestId);

      // Create the channel for these two frames to communicate and send the
      // corresponding ports to them.
      const messageChannel =
        channel === 'sidebar-host'
          ? this._sidebarHostChannel
          : new MessageChannel();

      // The message that is sent to the target frame that the source wants to
      // connect to, as well as the source frame requesting the connection.
      // Each message is accompanied by a port for the appropriate end of the
      // connection.
      const message = { frame1, frame2, type: 'offer', requestId, sourceId };

      // If the source window has an opaque origin [1], `event.origin` will be
      // the string "null". This is not a legal value for the `targetOrigin`
      // parameter to `postMessage`, so remap it to "*".
      //
      // [1] https://html.spec.whatwg.org/multipage/origin.html#origin.
      //     Documents with opaque origins include file:// URLs and
      //     sandboxed iframes.
      const targetOrigin = origin === 'null' ? '*' : origin;
      source.postMessage(message, targetOrigin, [messageChannel.port1]);

      if (frame2 === 'sidebar') {
        this._sidebarHostChannel.port2.postMessage(message, [
          messageChannel.port2,
        ]);
      } else if (frame2 === 'host') {
        this._emitter.emit('frameConnected', frame1, messageChannel.port2);
      }
    };

    this._listeners.add(
      window,
      'message',
      captureErrors(handleRequest, errorContext)
    );
  }

  /**
   * @param {object} options
   *   @param {Partial<Message>} options.allowedMessage - the `data` must match this
   *     `Message`.
   *   @param {string} options.allowedOrigin - the `origin` must match this
   *     value. If `allowedOrigin` is '*', the origin is ignored.
   *   @param {unknown} options.data - the data to be compared with `allowedMessage`.
   *   @param {string} options.origin - the origin to be compared with
   *     `allowedOrigin`.
   */
  _messageMatches({ allowedMessage, allowedOrigin, data, origin }) {
    if (allowedOrigin !== '*' && origin !== allowedOrigin) {
      return false;
    }

    return isMessageEqual(data, allowedMessage);
  }

  /**
   * @param {'frameConnected'} eventName
   * @param {(source: 'guest'|'sidebar', port: MessagePort) => void} handler - this handler
   *   fires when a frame connects to the host frame
   */
  on(eventName, handler) {
    this._emitter.on(eventName, handler);
  }

  destroy() {
    this._listeners.removeAll();
  }
}
