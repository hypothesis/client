import { useEffect } from 'preact/hooks';

import { listen } from '../../util/dom';

/**
 * @typedef Ref
 * @prop current {Node} - HTML node
 *
 * A ref object attached to a HTML node.
 */

/**
 * @typedef PreactRef
 * @prop current {Object} - preact component object
 *
 * A ref object attached to a custom preact component.
 */

/**
 * This hook adds appropriate `eventListener`s to the document when a target
 * element (`closeableEl`) is open. Events such as `click` and `focus` on
 * elements that fall outside of `closeableEl` in the document, or keydown
 * events for the `esc` key, will invoke the provided `handleClose` function
 * to indicate that `closeableEl` should be closed. This hook also performs
 * cleanup to remove `eventListener`s when appropriate.
 *
 * Limitation: This will not work when attached to a custom component that has
 * more than one element nested under a root <Fragment>
 *
 * @param {Ref|PreactRef} closeableEl - ref object:
 *                                Reference to a DOM element or preat component
 *                                that should be closed when DOM elements external
 *                                to it are interacted with or `Esc` is pressed
 * @param {bool} isOpen - Whether the element is currently open. This hook does
 *                        not attach event listeners/do anything if it's not.
 * @param {() => void} handleClose - A function that will do the actual closing
 *                                   of `closeableEl`
 */
export default function useElementShouldClose(
  closeableEl,
  isOpen,
  handleClose
) {
  /**
   *  Helper to return the underlying node object whether
   *  `closeableEl` is attached to an HTMLNode or Preact component.
   *
   *  @param {Preact ref} closeableEl
   *  @returns {Node}
   */

  const getCurrentNode = closeableEl => {
    // if base is present, assume its a preact component
    const node = closeableEl.current.base
      ? closeableEl.current.base
      : closeableEl.current;
    if (typeof node !== 'object') {
      throw new Error('useElementShouldClose can not find a node reference');
    }
    return node;
  };

  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    // Close element when user presses Escape key, regardless of focus.
    const removeKeypressListener = listen(document.body, ['keydown'], event => {
      if (event.key === 'Escape') {
        handleClose();
      }
    });

    // Close element if user focuses an element outside of it via any means
    // (key press, programmatic focus change).
    const removeFocusListener = listen(
      document.body,
      'focus',
      event => {
        const current = getCurrentNode(closeableEl);
        if (!current.contains(event.target)) {
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
        const current = getCurrentNode(closeableEl);
        if (!current.contains(event.target)) {
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
