/**
 * Commands for toggling markdown formatting of a selection
 * in an input field.
 *
 * All of the functions in this module take as input the current state
 * of the input field, parameters for the operation to perform and return the
 * new state of the input field.
 */

/**
 * Describes the state of a plain text input field.
 */
export type EditorState = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Types of Markdown link that can be inserted with
 * {@link convertSelectionToLink}.
 */
export enum LinkType {
  ANCHOR_LINK,
  IMAGE_LINK,
}

/**
 * Replace text in an input field and return the new state.
 *
 * @param state - The state of the input field.
 * @param pos - The start position of the text to remove.
 * @param length - The number of characters to remove.
 * @param text - The replacement text to insert at `pos`.
 * @return The new state of the input field.
 */
function replaceText(
  state: EditorState,
  pos: number,
  length: number,
  text: string
): EditorState {
  let newSelectionStart = state.selectionStart;
  let newSelectionEnd = state.selectionEnd;

  if (newSelectionStart >= pos + length) {
    // 1. Selection is after replaced text:
    //    Increment (start, end) by difference in length between original and
    //    replaced text
    newSelectionStart += text.length - length;
    newSelectionEnd += text.length - length;
  } else if (newSelectionEnd <= pos) {
    // 2. Selection is before replaced text: Leave selection unchanged
  } else if (newSelectionStart <= pos && newSelectionEnd >= pos + length) {
    // 3. Selection fully contains replaced text:
    //    Increment end by difference in length between original and replaced
    //    text
    newSelectionEnd += text.length - length;
  } else if (newSelectionStart < pos && newSelectionEnd < pos + length) {
    // 4. Selection overlaps start but not end of replaced text:
    //    Decrement start to start of replacement text
    newSelectionStart = pos;
  } else if (
    newSelectionStart < pos + length &&
    newSelectionEnd > pos + length
  ) {
    // 5. Selection overlaps end but not start of replaced text:
    //    Increment end by difference in length between original and replaced
    //    text
    newSelectionEnd += text.length - length;
  } else if (pos < newSelectionStart && pos + length > newSelectionEnd) {
    // 6. Replaced text fully contains selection:
    //    Expand selection to replaced text
    newSelectionStart = pos;
    newSelectionEnd = pos + length;
  }

  return {
    text: state.text.slice(0, pos) + text + state.text.slice(pos + length),
    selectionStart: newSelectionStart,
    selectionEnd: newSelectionEnd,
  };
}

/**
 * Convert the selected text into a Markdown link.
 *
 * @param state - The current state of the input field.
 * @param [linkType] - The type of link to insert.
 * @return The new state of the input field.
 */
export function convertSelectionToLink(
  state: EditorState,
  linkType: LinkType = LinkType.ANCHOR_LINK
): EditorState {
  const selection = state.text.slice(state.selectionStart, state.selectionEnd);

  let linkPrefix = '';
  if (linkType === LinkType.IMAGE_LINK) {
    linkPrefix = '!';
  }

  let newState;
  if (selection.match(/[a-z]+:\/\/.*/)) {
    // Selection is a URL, wrap it with a link and use the selection as
    // the target.
    const dummyLabel = 'Description';
    newState = replaceText(
      state,
      state.selectionStart,
      selection.length,
      linkPrefix + '[' + dummyLabel + '](' + selection + ')'
    );
    newState.selectionStart = state.selectionStart + linkPrefix.length + 1;
    newState.selectionEnd = newState.selectionStart + dummyLabel.length;
    return newState;
  } else {
    // Selection is not a URL, wrap it with a link and use the selection as
    // the label. Change the selection to the dummy link.
    const beforeURL = linkPrefix + '[' + selection + '](';
    const dummyLink = 'http://insert-your-link-here.com';
    newState = replaceText(
      state,
      state.selectionStart,
      selection.length,
      beforeURL + dummyLink + ')'
    );
    newState.selectionStart = state.selectionStart + beforeURL.length;
    newState.selectionEnd = newState.selectionStart + dummyLink.length;
    return newState;
  }
}

/**
 * Toggle Markdown-style formatting around a span of text.
 *
 * @param state - The current state of the input field.
 * @param prefix - The prefix to add or remove before the selection.
 * @param suffix - The suffix to add or remove after the selection, defaults to
 *   being the same as the prefix.
 * @param placeholder - The text to insert between 'prefix' and 'suffix' if the
 *   input text is empty.
 * @return The new state of the input field.
 */
export function toggleSpanStyle(
  state: EditorState,
  prefix: string,
  suffix: string | undefined,
  placeholder: string
): EditorState {
  if (typeof suffix === 'undefined') {
    suffix = prefix;
  }

  const selectionPrefix = state.text.slice(
    state.selectionStart - prefix.length,
    state.selectionStart
  );
  const selectionSuffix = state.text.slice(
    state.selectionEnd,
    state.selectionEnd + prefix.length
  );
  let newState = state;

  if (state.selectionStart === state.selectionEnd && placeholder) {
    newState = replaceText(state, state.selectionStart, 0, placeholder);
    newState.selectionStart = newState.selectionEnd - placeholder.length;
  }

  if (selectionPrefix === prefix && selectionSuffix === suffix) {
    newState = replaceText(
      newState,
      newState.selectionStart - prefix.length,
      prefix.length,
      ''
    );
    newState = replaceText(newState, newState.selectionEnd, suffix.length, '');
  } else {
    newState = replaceText(newState, newState.selectionStart, 0, prefix);
    newState = replaceText(newState, newState.selectionEnd, 0, suffix);
  }

  return newState;
}

/**
 * Find the nearest line beginning searching backwards from `pos`.
 */
function startOfLine(str: string, pos: number) {
  const start = str.lastIndexOf('\n', pos);
  if (start < 0) {
    return 0;
  } else {
    return start + 1;
  }
}

/**
 * Find the nearest line ending searching forwards from `pos`.
 */
function endOfLine(str: string, pos: number) {
  const end = str.indexOf('\n', pos);
  if (end < 0) {
    return str.length;
  } else {
    return end;
  }
}

type TransformLinesCallback = (
  state: EditorState,
  start: number,
  end: number,
  lineIndex: number
) => EditorState;

/**
 * Transform lines between two positions in an input field.
 *
 * @param state - The initial state of the input field
 * @param start - The start position within the input text
 * @param end - The end position within the input text
 * @param callback
 *  - Callback which is invoked with the current state of the input and
 *    the start of the current line and returns the new state of the input.
 */
function transformLines(
  state: EditorState,
  start: number,
  end: number,
  callback: TransformLinesCallback
) {
  let lineStart = startOfLine(state.text, start);
  let lineEnd = endOfLine(state.text, start);
  let lineIndex = 0;

  while (lineEnd <= endOfLine(state.text, end)) {
    const isLastLine = lineEnd === state.text.length;
    const currentLineLength = lineEnd - lineStart;

    state = callback(state, lineStart, lineEnd, lineIndex);

    const newLineLength = endOfLine(state.text, lineStart) - lineStart;
    end += newLineLength - currentLineLength;

    if (isLastLine) {
      break;
    }
    lineStart = lineStart + newLineLength + 1;
    lineEnd = endOfLine(state.text, lineStart);
    lineIndex += 1;
  }
  return state;
}

/**
 * Toggle Markdown-style formatting around a block of text.
 *
 * @param state - The current state of the input field.
 * @param prefix - The prefix to add or remove before each line of the
 *   selection, or a callback which returns said prefix for a specific line
 *   index (useful for multi-line selections that require different prefixes
 *   per line).
 * @return The new state of the input field.
 */
export function toggleBlockStyle(
  state: EditorState,
  prefix: string | ((lineIndex: number) => string)
): EditorState {
  const start = state.selectionStart;
  const end = state.selectionEnd;
  const prefixToString = (lineIndex: number) =>
    typeof prefix === 'function' ? prefix(lineIndex) : prefix;

  // Test whether all lines in the selected range already have the style
  // applied
  let blockHasStyle = true;
  transformLines(state, start, end, (state, lineStart, _lineEnd, lineIndex) => {
    const prefix = prefixToString(lineIndex);
    if (state.text.slice(lineStart, lineStart + prefix.length) !== prefix) {
      blockHasStyle = false;
    }
    return state;
  });

  if (blockHasStyle) {
    // Remove the formatting.
    return transformLines(
      state,
      start,
      end,
      (state, lineStart, _lineEnd, lineIndex) => {
        const prefix = prefixToString(lineIndex);
        return replaceText(state, lineStart, prefix.length, '');
      }
    );
  } else {
    // Add the block style to any lines which do not already have it applied
    return transformLines(
      state,
      start,
      end,
      (state, lineStart, _lineEnd, lineIndex) => {
        const prefix = prefixToString(lineIndex);
        if (state.text.slice(lineStart, lineStart + prefix.length) === prefix) {
          return state;
        } else {
          return replaceText(state, lineStart, 0, prefix);
        }
      }
    );
  }
}
