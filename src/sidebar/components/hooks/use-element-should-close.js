import { useEffect } from 'preact/hooks';

import { normalizeKeyName } from '../../../shared/browser-compatibility-utils';
import { listen } from '../../util/dom';

/**
 * @template T
 * @typedef {import("preact/hooks").Ref<T>} Ref
 */

/**
 * @typedef PreactElement
 * @prop {Node} base
 */

/**
 * @typedef {Ref<HTMLElement> | Ref<PreactElement>} PreactRef
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
 * @param {PreactRef} closeableEl - ref object:
 *                                Reference to a DOM element or preat component
 *                                that should be closed when DOM elements external
 *                                to it are interacted with or `Esc` is pressed
 * @param {boolean} isOpen - Whether the element is currently open. This hook does
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
   *  @param {PreactRef} closeableEl
   *  @returns {Node}
   */

  const getCurrentNode = closeableEl => {
    // if base is present, assume its a preact component
    const node = /** @type {PreactElement} */ (closeableEl.current).base
      ? /** @type {PreactElement} */ (closeableEl.current).base
      : closeableEl.current;
    if (typeof node !== 'object') {
      throw new Error('useElementShouldClose can not find a node reference');
    }
    return /** @type {Node} */ (node);
  };

  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    // Close element when user presses Escape key, regardless of focus.
    const removeKeyDownListener = listen(document.body, ['keydown'], event => {
      const keyEvent = /** @type {KeyboardEvent} */ (event);
      if (normalizeKeyName(keyEvent.key) === 'Escape') {
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
        if (!current.contains(/** @type {Node} */ (event.target))) {
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
        if (!current.contains(/** @type {Node} */ (event.target))) {
          handleClose();
        }
      },
      { useCapture: true }
    );

    return () => {
      removeKeyDownListener();
      removeClickListener();
      removeFocusListener();
    };
  }, [closeableEl, isOpen, handleClose]);
}
