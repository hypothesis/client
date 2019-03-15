'use strict';

const SIDEBAR_TRIGGER_BTN_ATTR = 'data-hypothesis-trigger';

/**
 * Show the sidebar when user clicks on an element with the
 * trigger data attribute.
 *
 * @param {Element} rootEl - The DOM element which contains the trigger elements.
 * @param {Object} showFn - Function which shows the sidebar.
 */

function trigger(rootEl, showFn) {
  const triggerElems = rootEl.querySelectorAll(
    '[' + SIDEBAR_TRIGGER_BTN_ATTR + ']'
  );

  Array.from(triggerElems).forEach(function(triggerElem) {
    triggerElem.addEventListener('click', handleCommand);
  });

  function handleCommand(event) {
    showFn();
    event.stopPropagation();
  }
}

module.exports = trigger;
