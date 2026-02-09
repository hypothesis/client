export function nodeIsElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function nodeIsText(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

/**
 * Return true if the event target is in an editable context where we should
 * not intercept keyboard shortcuts (e.g. user is typing).
 * Covers INPUT, TEXTAREA, contenteditable, and role="textbox" for WCAG 2.1.4.
 */
export function isEditableContext(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const el = target;
  if (['INPUT', 'TEXTAREA'].includes(el.tagName.toUpperCase())) {
    return true;
  }
  if (el.isContentEditable) {
    return true;
  }
  if (
    el.getAttribute?.('role') === 'textbox' ||
    el.closest?.('[role="textbox"]')
  ) {
    return true;
  }
  return false;
}
