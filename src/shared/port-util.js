// Because there are many `postMessages` on the `host` frame, the SOURCE property
// is added to the hypothesis `postMessages` to identify the provenance of the
// message and avoid listening to messages that could have the same properties
// but different source. This is not a security feature but an
// anti-collision mechanism.
const SOURCE = 'hypothesis';

/**
 * These types are the used in by `PortProvider` and `PortFinder` for the
 * inter-frame discovery and communication processes.
 * @typedef {'guest-host'|'guest-sidebar'|'host-sidebar'|'notebook-sidebar'} Channel
 * @typedef {'guest'|'host'|'notebook'|'sidebar'} Port
 *
 * @typedef Message
 * @prop {Channel} channel
 * @prop {Port} port
 * @prop {'offer'|'request'}  type
 * @prop {SOURCE} source -
 */

/**
 * The function checks if the data conforms to the expected format. It returns
 * `true` if all the properties are including the correct value in the `source`
 *  property, otherwise it returns `false`.
 *
 * @param {any} data
 * @return {data is Message}
 */
function isMessageValid(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  for (let property of ['channel', 'port', 'source', 'type']) {
    if (
      data.hasOwnProperty(property) === false ||
      typeof data[property] !== 'string'
    ) {
      return false;
    }
  }

  return data.source === SOURCE;
}

/**
 * Compares a `postMessage` data to one `Message`
 *
 * @param {any} data
 * @param {Message} message
 */
export function isMessageEqual(data, message) {
  if (!isMessageValid(data)) {
    return false;
  }

  try {
    return (
      JSON.stringify(data, Object.keys(data).sort()) ===
      JSON.stringify(message, Object.keys(message).sort())
    );
  } catch (error) {
    return false;
  }
}
