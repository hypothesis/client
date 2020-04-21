import { normalizeKeyName } from '../../shared/browser-compatibility-utils';

/**
 * Return a set of props that can be applied to a React DOM element to make
 * it activateable like a button.
 *
 * Before using this helper, consider if there is a more appropriate semantic
 * HTML element which will provide the behaviors you need automatically.
 *
 * @param {string} role - ARIA role for the item
 * @param {Function} handler - Event handler
 * @return {Object} Props to spread into a React element
 */
export function onActivate(role, handler) {
  return {
    // Support mouse activation.
    onClick: handler,

    // Support keyboard activation.
    onKeyDown: event => {
      const key = normalizeKeyName(event.key);
      if (key === 'Enter' || key === ' ') {
        handler(event);
      }
    },

    // Every item that is "activateable" should have an appropriate ARIA role.
    role,

    // Make item focusable using the keyboard.
    tabIndex: 0,
  };
}
