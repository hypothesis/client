const { useEffect } = require('preact/hooks');

const { listen } = require('../../util/dom');

/**
 * This hook adds appropriate `eventListener`s to the document when a target
 * element (`closeableEl`) is open. Events such as `click` and `focus` on
 * elements that fall outside of `closeableEl` in the document, or keypress
 * events for the `esc` key, will invoke the provided `handleClose` function
 * to indicate that `closeableEl` should be closed. This hook also performs
 * cleanup to remove `eventListener`s when appropriate.
 *
 * @param {Object} closeableEl - Preact ref object:
 *                                Reference to a DOM element that should be
 *                                closed when DOM elements external to it are
 *                                interacted with or `Esc` is pressed
 * @param {bool} isOpen - Whether the element is currently open. This hook does
 *                        not attach event listeners/do anything if it's not.
 * @param {() => void} handleClose - A function that will do the actual closing
 *                                   of `closeableEl`
 */
function useElementShouldClose(closeableEl, isOpen, handleClose) {
  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    // Close element when user presses Escape key, regardless of focus.
    const removeKeypressListener = listen(
      document.body,
      ['keypress'],
      event => {
        if (event.key === 'Escape') {
          handleClose();
        }
      }
    );

    // Close element if user focuses an element outside of it via any means
    // (key press, programmatic focus change).
    const removeFocusListener = listen(
      document.body,
      'focus',
      event => {
        if (!closeableEl.current.contains(event.target)) {
          handleClose();
        }
      },
      { useCapture: true }
    );

    // Close element if user clicks outside of it, even if on an element which
    // does not accept focus.
    const removeClickListener = listen(
      document.body,
      ['mousedown', 'click'],
      event => {
        if (!closeableEl.current.contains(event.target)) {
          handleClose();
        }
      },
      { useCapture: true }
    );

    return () => {
      removeKeypressListener();
      removeClickListener();
      removeFocusListener();
    };
  }, [closeableEl, isOpen, handleClose]);
}

module.exports = useElementShouldClose;
