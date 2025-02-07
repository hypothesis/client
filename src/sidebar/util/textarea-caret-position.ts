// Hidden div used by `getCaretCoordinates` to mirror content of text area.
let mirrorDiv: HTMLElement | undefined;

// Enable debug mode. This makes the hidden div used to measure the caret
// position visible and keeps it in the DOM after the position is calculated.
const mirrorDebug = false;

/**
 * Calculate the coordinates of the caret position within a textarea.
 *
 * @return Coordinates of the caret relative to the textarea's top-left corner
 */
export function getCaretCoordinates(textarea: HTMLTextAreaElement): {
  x: number;
  y: number;
} {
  if (!mirrorDiv) {
    mirrorDiv = document.createElement('div');
    document.body.append(mirrorDiv);
  }

  try {
    const textareaRect = textarea.getBoundingClientRect();

    // Style text in the mirror to match the textarea
    const styles = window.getComputedStyle(textarea);
    mirrorDiv.style.font = styles.font;
    mirrorDiv.style.padding = styles.padding;
    mirrorDiv.style.whiteSpace = 'pre-wrap';
    mirrorDiv.style.wordWrap = 'break-word';
    mirrorDiv.style.position = 'fixed';

    /* istanbul ignore next */
    if (!mirrorDebug) {
      mirrorDiv.style.visibility = 'hidden';
    } else {
      mirrorDiv.style.pointerEvents = 'none';
      mirrorDiv.style.background = 'rgba(255, 0, 0, 0.5)';
    }

    // Position mirror above the textarea
    mirrorDiv.style.width = `${textareaRect.width}px`;
    mirrorDiv.style.height = `${textareaRect.height}px`;
    mirrorDiv.style.top = `${textareaRect.top}px`;
    mirrorDiv.style.left = `${textareaRect.left}px`;

    // Update mirror content to match textarea and insert an element at the
    // caret position.
    //
    // We need to include the text before and after the caret so that the scroll
    // height is the same as the text area.
    const caretPosition = textarea.selectionStart;
    const caretSpan = document.createElement('span');

    // Align top of caret indicator with bottom of line. This makes the precise
    // position a little easier to reason about. Otherwise it will be aligned
    // with the baseline.
    caretSpan.style.display = 'inline-block';
    caretSpan.style.verticalAlign = 'bottom';

    const textBeforeCaret = textarea.value.substring(0, caretPosition);
    const textAfterCaret = textarea.value.slice(caretPosition);

    // Add a non-empty line at the end. This avoids a problem where the mirror's
    // scrollable height can be less than the textarea if the text content ends
    // with a new line.
    const suffix = '\nx';

    mirrorDiv.innerHTML = '';
    mirrorDiv.append(textBeforeCaret, caretSpan, textAfterCaret, suffix);

    // Adjust scroll position to match the textarea. For this to work, the
    // scrollable height of the mirror must be at least equal to the scrollable
    // height of the text area.
    mirrorDiv.style.overflowY = 'auto';
    mirrorDiv.scrollTop = textarea.scrollTop;

    // Capture caret position relative to top-left corner of textarea.
    const rect = caretSpan.getBoundingClientRect();

    return {
      x: rect.left - textareaRect.left,
      y: rect.top - textareaRect.top,
    };
  } finally {
    if (!mirrorDebug) {
      mirrorDiv.remove();
      mirrorDiv = undefined;
    }
  }
}
