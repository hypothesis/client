// Because there are many `postMessages` on the `host` frame, the SOURCE property
// is added to the hypothesis `postMessages` to identify the provenance of the
// message and avoid listening to messages that could have the same properties
// but different source. This is not a security feature but an
// anti-collision mechanism.
const AUTHORITY = 'hypothesis';

/**
 * These types are the used in by `PortProvider` and `PortFinder` for the
 * inter-frame discovery and communication processes.
 *
 * @typedef {'guest'|'host'|'notebook'|'sidebar'} Frame
 *
 * @typedef Message
 * @prop {AUTHORITY} authority
 * @prop {Frame} frame1
 * @prop {Frame} frame2
 * @prop {'offer'|'request'} type
 */

/**
 * Return true if an object, eg. from the data field of a `MessageEvent`, is a
 * valid `Message`.
 *
 * @param {any} data
 * @return {data is Message}
 */
function isMessage(data) {
  if (data === null || typeof data !== 'object') {
    return false;
  }

  for (let property of ['frame1', 'frame2', 'type']) {
    if (typeof data[property] !== 'string') {
      return false;
    }
  }

  return data.authority === AUTHORITY;
}

/**
 * Compares a `postMessage` data to one `Message`
 *
 * @param {any} data
 * @param {Message} message
 */
export function isMessageEqual(data, message) {
  if (!isMessage(data)) {
    return false;
  }

  try {
    return (
      JSON.stringify(data, Object.keys(data).sort()) ===
      JSON.stringify(message, Object.keys(message).sort())
    );
  } catch {
    return false;
  }
}

/**
 * Check that source is of type Window.
 *
 * @param {MessageEventSource|null} source
 * @return {source is Window}
 */
export function isSourceWindow(source) {
  if (
    // `source` can be of type Window | MessagePort | ServiceWorker.
    // The simple check `source instanceof Window`` doesn't work here.
    // Alternatively, `source` could be casted `/** @type{Window} */ (source)`
    source === null ||
    source instanceof MessagePort ||
    source instanceof ServiceWorker
  ) {
    return false;
  }

  return true;
}
