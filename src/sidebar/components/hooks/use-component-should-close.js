'use strict';

const { useEffect } = require('preact/hooks');

const { listen } = require('../../util/dom');

function useComponentShouldClose(componentRef, isOpen, handleClose) {
  useEffect(() => {
    if (!isOpen) {
      return () => {};
    }

    // Close component when user presses Escape key, regardless of focus.
    const removeKeypressListener = listen(
      document.body,
      ['keypress'],
      event => {
        if (event.key === 'Escape') {
          handleClose();
        }
      }
    );

    // Close menu if user focuses an element outside the component via any means
    // (key press, programmatic focus change).
    const removeFocusListener = listen(
      document.body,
      'focus',
      event => {
        if (!componentRef.current.contains(event.target)) {
          handleClose();
        }
      },
      { useCapture: true }
    );

    // Close menu if user clicks outside component, even if on an element which
    // does not accept focus.
    const removeClickListener = listen(
      document.body,
      ['mousedown', 'click'],
      event => {
        // nb. Mouse events inside the current menu are handled elsewhere.
        if (!componentRef.current.contains(event.target)) {
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
  }, [componentRef, isOpen, handleClose]);
}

module.exports = useComponentShouldClose;
