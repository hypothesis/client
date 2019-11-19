'use strict';

/**
 * Watch for changes in the size (`clientWidth` and `clientHeight`) of
 * an element.
 *
 * Returns a cleanup function which should be called to remove observers when
 * updates are no longer needed.
 *
 * @param {Element} element - HTML element to watch
 * @param {(width: number, height: number) => any} onSizeChanged -
 *   Callback to invoke with the `clientWidth` and `clientHeight` of the
 *   element when a change in its size is detected.
 * @return {() => void}
 */
function observeElementSize(element, onSizeChanged) {
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() =>
      onSizeChanged(element.clientWidth, element.clientHeight)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }

  // Fallback method which listens for the most common events that result in
  // element size changes:
  //
  // - Window size change
  // - Media loading and adjusting size to content
  // - DOM changes
  //
  // This is not comprehensive but it is simple to implement and good-enough for
  // our current use cases.

  let prevWidth = element.clientWidth;
  let prevHeight = element.clientHeight;

  const check = () => {
    if (
      prevWidth !== element.clientWidth ||
      prevHeight !== element.clientHeight
    ) {
      prevWidth = element.clientWidth;
      prevHeight = element.clientHeight;
      onSizeChanged(prevWidth, prevHeight);
    }
  };

  element.addEventListener('load', check);
  window.addEventListener('resize', check);
  const observer = new MutationObserver(check);
  observer.observe(element, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  return () => {
    element.removeEventListener('load', check);
    window.removeEventListener('resize', check);
    observer.disconnect();
  };
}

module.exports = observeElementSize;
