/**
 * Attach listeners for one or multiple events to an element and return a
 * function that removes the listeners.
 *
 * @param {Element}
 * @param {string[]} events
 * @param {(event: Event) => any} listener
 * @param {boolean} [options.useCapture]
 * @return {function} Function which removes the event listeners.
 */
export function listen(element, events, listener, { useCapture = false } = {}) {
  if (!Array.isArray(events)) {
    events = [events];
  }
  events.forEach(event =>
    element.addEventListener(event, listener, useCapture)
  );
  return () => {
    events.forEach(event =>
      element.removeEventListener(event, listener, useCapture)
    );
  };
}

/**
 * Obtain the pixel height of the element with id `elementId`, including
 * top and bottom margins.
 *
 * @param {HTMLElement} element
 * @return {number} - The element's height in pixels
 */
export function getElementHeightWithMargins(element) {
  const style = window.getComputedStyle(element);
  // Get the height of the element inside the border-box, excluding
  // top and bottom margins.
  const elementHeight = element.getBoundingClientRect().height;

  // Get the bottom margin of the element. style.margin{Side} will return
  // values of the form 'Npx', from which we extract 'N'.
  const marginHeight =
    parseFloat(style.marginTop) + parseFloat(style.marginBottom);

  return elementHeight + marginHeight;
}
