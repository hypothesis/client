/**
 * Normalize a keyboard event key name.
 *
 * Several old browsers, such as IE11, use alternate key
 * names for keyboard events. If any abnormal keys are used,
 * this method returns the normalized name so our UI
 * components don't require a special case.
 *
 * @param {string} key - The keyboard event `key` name
 * @return {string} - Normalized `key` name
 */
export function normalizeKeyName(key) {
  const mappings = {
    Left: 'ArrowLeft',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Right: 'ArrowRight',
    Spacebar: ' ',
    Del: 'Delete',
  };
  return mappings[key] ? mappings[key] : key;
}
