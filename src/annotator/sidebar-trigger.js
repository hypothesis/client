const SIDEBAR_TRIGGER_BTN_ATTR = 'data-hypothesis-trigger';

/**
 * Show the sidebar when user clicks on an element with the
 * trigger data attribute.
 *
 * @param {Element} rootEl - The DOM element which contains the trigger elements.
 * @param {() => void} showFn - Function which shows the sidebar.
 */
export function sidebarTrigger(rootEl, showFn) {
  const triggerElems = rootEl.querySelectorAll(
    '[' + SIDEBAR_TRIGGER_BTN_ATTR + ']'
  );

  Array.from(triggerElems).forEach(triggerElem => {
    triggerElem.addEventListener('click', e => {
      showFn();
      e.stopPropagation();
    });
  });
}
