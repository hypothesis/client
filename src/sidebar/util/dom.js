'use strict';

/**
 * Attach `handler` as an event listener for `events` on `element`.
 *
 * @return {function} Function which removes the event listeners.
 */
function listen(element, events, handler) {
  if (!Array.isArray(events)) {
    events = [events];
  }
  events.forEach(event => element.addEventListener(event, handler));
  return () => {
    events.forEach(event => element.removeEventListener(event, handler));
  };
}

module.exports = {
  listen,
};
