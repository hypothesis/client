import { useEffect } from 'preact/hooks';

import { normalizeKeyName } from '../../../shared/browser-compatibility-utils';
import { listen } from '../../util/dom';

/**
 * @template T
 * @typedef {import("preact/hooks").Ref<T>} Ref
 */

/**
 * This hook provides a way to close or hide an element when a user interacts
 * with elements outside of it or presses the Esc key. It can be used to
 * create non-modal popups (eg. for menus, autocomplete lists and non-modal dialogs)
 * that automatically close when appropriate.
 *
 * When the element is visible/open, this hook monitors for document interactions
 * that should close it - such as clicks outside the element or Esc key presses.
 * When such an interaction happens, the `handleClose` callback is invoked.
 *
 * @param {Ref<HTMLElement>} closeableEl - Outer DOM element for the popup
 * @param {boolean} isOpen - Whether the popup is currently visible/open
 * @param {() => void} handleClose - Callback invoked to close the popup
 */
export default function useElementShouldClose(
  closeableEl,
  isOpen,
  handleClose
) {
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
        if (!closeableEl.current.contains(/** @type {Node} */ (event.target))) {
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
        if (!closeableEl.current.contains(/** @type {Node} */ (event.target))) {
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
