'use strict';

/**
 * Callback invoked when another frame is discovered in this window which runs
 * the Hypothesis sidebar or annotation layer code.
 *
 * @type {Function} DiscoveryCallback
 * @param {Window} source - The frame that was discovered.
 * @param {string} origin - The origin to use when posting messages to this frame.
 * @param {string} token - A random identifier used by this frame.
 */

/**
 * Discovery finds frames in the current tab/window that can be annotated (the
 * "clients") or can fetch annotations from the backend (the "server").
 *
 * Currently only one frame can be designated as the server.
 * (FIXME: This causes problems. See https://github.com/hypothesis/client/issues/249,
 * https://github.com/hypothesis/client/issues/187).
 *
 * The discovery process works as follows:
 *
 * 1. Clients and servers perform a top-down, breadth-first traversal of the
 *    frame hierarchy in the tab and send either an "offer" (server) or
 *    "discovery" (client) message to each frame, except for their own frame.
 * 2. Clients listen for "offer" messages and respond with "request" messages.
 * 3. Servers listen for "discovery" messages and respond with "offer"
 *    messages.
 * 4. Servers also listen for "request" messages and respond with "ack" messages
 *    that include a random channel identifier. At this point servers call
 *    the callback to `startDiscovery`.
 * 5. Clients listen for "ack" messages. When they receive one from a server
 *    they call the callback to `startDiscovery`.
 */
class Discovery {
  /**
   * @param {Window} target
   * @param {Object} options
   */
  constructor(target, options = {}) {
    /** The window to send and listen for messages with. */
    this.target = target;

    /**
     * Set whether this frame acts as a server (fetches annotations from the
     * API) or a client (contains annotatable content and displays highlights).
     */
    this.server = false;

    /** Origins allowed to communicate with this frame. */
    this.origin = '*';

    /**
     * Flag set in client frames to indicate when they are waiting for a
     * confirmation from a server frame.
     */
    this.requestInProgress = false;

    this.onDiscovery = null;

    if (typeof options.server !== 'undefined') {
      this.server = options.server;
    }

    if (typeof options.origin !== 'undefined') {
      this.origin = options.origin;
    }

    this._onMessage = this._onMessage.bind(this);
  }

  /**
   * Find other frames to communicate with.
   *
   * See the class overview for a description of how the discovery process
   * works.
   *
   * @param {DiscoveryCallback} onDiscovery - Callback to invoke with a token when
   *   another frame is discovered.
   */
  startDiscovery(onDiscovery) {
    if (this.onDiscovery) {
      throw new Error(
        'Discovery is already in progress. Call stopDiscovery() first'
      );
    }

    this.onDiscovery = onDiscovery;

    // Listen for messages from other frames.
    this.target.addEventListener('message', this._onMessage, false);
    this._beacon();
  }

  /**
   * Stop listening for communication requests from other frames.
   */
  stopDiscovery() {
    this.onDiscovery = null;
    this.target.removeEventListener('message', this._onMessage);
  }

  /**
   * Send a message to other frames in the current window to inform them about
   * the existence of this frame and tell them whether this frame is a client
   * or server.
   */
  _beacon() {
    let beaconMessage;
    if (this.server) {
      beaconMessage = '__cross_frame_dhcp_offer';
    } else {
      beaconMessage = '__cross_frame_dhcp_discovery';
    }

    // Perform a top-down, breadth-first traversal of frames in the current
    // window and send messages to them.
    const queue = [this.target.top];
    while (queue.length > 0) {
      const parent = queue.shift();
      if (parent !== this.target) {
        parent.postMessage(beaconMessage, this.origin);
      }
      for (let i = 0; i < parent.frames.length; i++) {
        queue.push(parent.frames[i]);
      }
    }
  }

  /**
   * Handle a `MessageEvent` from another frame which _may_ be from a
   * `Discovery` instance.
   */
  _onMessage(event) {
    const { source, data } = event;
    let origin = event.origin;

    // If `origin` is 'null' the source frame is a file URL or loaded over some
    // other scheme for which the `origin` is undefined. In this case, the only
    // way to ensure the message arrives is to use the wildcard origin. See:
    //
    //   https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    //
    // When sending messages to or from a Firefox WebExtension, current
    // versions of Firefox have a bug that causes the origin check to fail even
    // though the target and actual origins of the message match.
    if (
      origin === 'null' ||
      origin.match('moz-extension:') ||
      window.location.protocol === 'moz-extension:'
    ) {
      origin = '*';
    }

    // Check if this is a recognized message from a `Discovery` instance in
    // another frame.
    const match =
      typeof data === 'string' &&
      data.match(
        /^__cross_frame_dhcp_(discovery|offer|request|ack)(?::(\d+))?$/
      );
    if (!match) {
      return;
    }

    // Handle the message, and send a response back to the original frame if
    // appropriate.
    let [, messageType, messageToken] = match;
    const { reply, discovered, token } = this._processMessage(
      messageType,
      messageToken,
      origin
    );

    if (reply) {
      source.postMessage('__cross_frame_dhcp_' + reply, origin);
    }

    // Notify caller of `startDiscovery` in this frame that we found another
    // frame.
    if (discovered) {
      this.onDiscovery.call(null, source, origin, token);
    }
  }

  _processMessage(messageType, token, origin) {
    let reply = null;
    let discovered = false;

    if (this.server) {
      // Handle message as a server frame.
      if (messageType === 'discovery') {
        reply = 'offer';
      } else if (messageType === 'request') {
        token = this.generateToken();
        reply = `ack:${token}`;
        discovered = true;
      } else if (messageType === 'offer' || messageType === 'ack') {
        throw new Error(
          `A second Discovery server has been detected at ${origin}.
 This is unsupported and will cause unexpected behaviour.`
        );
      }
    } else {
      // Handle message as a client frame.
      // eslint-disable-next-line no-lonely-if
      if (messageType === 'offer') {
        // eslint-disable-line no-lonely-if
        if (!this.requestInProgress) {
          this.requestInProgress = true;
          reply = 'request';
        }
      } else if (messageType === 'ack') {
        this.requestInProgress = false;
        discovered = true;
      }
    }

    return { reply, discovered, token };
  }

  /**
   * Generate a random identifier for a communication channel between a client
   * and a server.
   */
  generateToken() {
    return Math.random()
      .toString()
      .replace(/\D/g, '');
  }
}

module.exports = Discovery;
