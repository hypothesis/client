/**
 * Normalize a keyboard event key name.
 *
 * Some old Microsoft browsers, such as IE 11 and Edge Legacy [1], use non-standard
 * names for some keys. If any abnormal keys are used, this method returns the
 * normalized name so our UI components don't require a special case.
 *
 * [1] https://caniuse.com/keyboardevent-key
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
