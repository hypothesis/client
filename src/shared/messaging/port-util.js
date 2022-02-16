/**
 * These types are the used in by `PortProvider` and `PortFinder` for the
 * inter-frame discovery and communication processes.
 *
 * @typedef {'guest'|'host'|'notebook'|'sidebar'} Frame
 *
 * @typedef Message
 * @prop {Frame} frame1
 * @prop {Frame} frame2
 * @prop {'offer'|'request'} type
 * @prop {string} requestId - ID of the request. Used to associate `offer`
 *   responses with requests and enable PortProvider to ignore re-sent requests.
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
 * @return {data is Message}
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
