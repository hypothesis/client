/**
 * Message sent by `PortProvider` and `PortFinder` to establish a
 * MessageChannel-based connection between two frames.
 *
 * @typedef {'guest'|'host'|'notebook'|'profile'|'sidebar'} Frame
 *
 * @typedef Message
 * @prop {Frame} frame1 - Role of the source frame
 * @prop {Frame} frame2 - Role of the target frame
 * @prop {'offer'|'request'} type - Message type. "request" messages are sent
 *   by the source frame to the host frame to request a connection. "offer"
 *   messages are sent from the host frame back to the source frame and also
 *   to the target frame, accompanied by a MessagePort.
 * @prop {string} requestId - ID of the request. Used to associate "offer"
 *   messages with their corresponding "request" messages.
 * @prop {string} [sourceId] - Identifier for the source frame. This is useful
 *   in cases where multiple source frames with a given role may connect to
 *   the same destination frame.
 */

/**
 * Return true if an object, eg. from the data field of a `MessageEvent`, is a
 * valid `Message`.
 *
 * @param {any} data
 * @return {data is Message}
 */
export function isMessage(data) {
  if (data === null || typeof data !== 'object') {
    return false;
  }

  for (let property of ['frame1', 'frame2', 'type', 'requestId']) {
    if (typeof data[property] !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Return true if the data payload from a MessageEvent matches `message`.
 *
 * @param {any} data
 * @param {Partial<Message>} message
 */
export function isMessageEqual(data, message) {
  if (!isMessage(data)) {
    return false;
  }

  // We assume `JSON.stringify` cannot throw because `isMessage` verifies that
  // all the fields we serialize here are serializable values.
  return (
    JSON.stringify(data, Object.keys(message).sort()) ===
    JSON.stringify(message, Object.keys(message).sort())
  );
}

/**
 * Check that source is of type Window.
 *
 * @param {MessageEventSource|null} source
 * @return {source is Window}
 */
export function isSourceWindow(source) {
  if (
    // `source` can be of type Window, MessagePort, ServiceWorker, or null.
    // `source instanceof Window` doesn't work in Chrome if `source` is a
    // cross-origin window.
    source === null ||
    source instanceof MessagePort ||
    (window.ServiceWorker && source instanceof ServiceWorker)
  ) {
    return false;
  }

  return true;
}
