/**
 * These types are the used in by `PortProvider` and `PortFinder` for the
 * inter-frame discovery and communication processes.
 *
 * @typedef {{frame1: 'guest', frame2: 'host'}} GuestChannel1 - guest-host
 * @typedef {{frame1: 'guest', frame2: 'sidebar'}} GuestChannel2 - guest-sidebar
 * @typedef {{frame1: 'notebook', frame2: 'sidebar'}} NotebookChannel - notebook-sidebar
 * @typedef {{frame1: 'sidebar', frame2: 'host'}} SidebarChannel - sidebar-host
 * @typedef {GuestChannel1|GuestChannel2|NotebookChannel|SidebarChannel} Channel
 * @typedef {Channel & {type: 'offer'|'request'}} Message
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

  return true;
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
