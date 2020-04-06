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
 * @param {string} elementId - The DOM element's id attribute
 * @return {number|null} - The element's height in pixels or `null` if no
 *                         element with id `elementId` exists
 */
export function getElementHeightWithMargins(elementId) {
  const threadElement = document.getElementById(elementId);
  if (!threadElement) {
    return null;
  }
  const style = window.getComputedStyle(threadElement);
  // Get the height of the element inside the border-box, excluding
  // top and bottom margins.
  const elementHeight = threadElement.getBoundingClientRect().height;

  // Get the bottom margin of the element. style.margin{Side} will return
  // values of the form 'Npx', from which we extract 'N'.
  const marginHeight =
    parseFloat(style.marginTop) + parseFloat(style.marginBottom);

  return elementHeight + marginHeight;
}
