/**
 * Copy the string `text` using clipboard API. If it fails use the legacy hack.
 *
 * If clipboard.writeText is been called from an iframe, the iframe must allow `clipboard-write`
 *
 * @param {string} text
 * @return {Promise<void>}
 */
export function copyText(text) {
  try {
    return navigator.clipboard.writeText(text);
  } catch {
    return copyTextAlternative(text);
  }
}

/**
 * Copy the string `text` to the clipboard (legacy)
 *
 * In most browsers, this function can only be called in response to a user
 * gesture. For example in response to a "click" event.
 *
 * @throws {Error}
 *   This function may throw an exception if the browser rejects the attempt
 *   to copy text.
 * @param {string} text
 * @return {Promise<void>}
 */
function copyTextAlternative(text) {
  const temp = document.createElement('input');
  temp.value = text;
  temp.setAttribute('data-testid', 'copy-text');
  // Recipe from https://stackoverflow.com/a/34046084/14463679
  temp.contentEditable = 'true';
  document.body.appendChild(temp);
  temp.focus();

  try {
    const range = document.createRange();
    const selection = /** @type {Selection} */ (document.getSelection());

    selection.removeAllRanges();
    range.selectNodeContents(temp);
    selection.addRange(range);
    temp.setSelectionRange(0, temp.value.length);
    document.execCommand('copy');
  } finally {
    temp.remove();
  }
  return Promise.resolve();
}
