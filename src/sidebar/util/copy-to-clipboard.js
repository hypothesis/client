'use strict';

/**
 * Copy the string `text` to the clipboard.
 *
 * In most browsers, this function can only be called in response to a user
 * gesture. For example in response to a "click" event.
 *
 * @throws {Error}
 *   This function may throw an exception if the browser rejects the attempt
 *   to copy text.
 */
function copyText(text) {
  const temp = document.createElement('span');
  temp.className = 'copy-text';
  temp.textContent = text;
  document.body.appendChild(temp);

  try {
    const range = document.createRange();
    const selection = document.getSelection();

    selection.removeAllRanges();
    range.selectNodeContents(temp);
    selection.addRange(range);
    document.execCommand('copy');
  } finally {
    temp.remove();
  }
}

module.exports = { copyText };
