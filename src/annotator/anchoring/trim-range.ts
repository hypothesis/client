/**
 * From which direction to evaluate strings or nodes: from the START of a string
 * or range looking forward, or from the END of a string or range looking
 * backward.
 */
enum FromPosition {
  START = 1,
  END,
}

/**
 * Return the offset of the nearest non-whitespace character to `baseOffset`
 * within `text`, looking in the `direction` indicated. Return -1 if no
 * non-whitespace character exists between `baseOffset` and the terminus of the
 * string (start or end depending on `direction`).
 */
function trimTextOffset(
  text: string,
  baseOffset: number,
  direction = FromPosition.START
): number {
  const nextChar =
    direction === FromPosition.START ? baseOffset : baseOffset - 1;
  if (text.charAt(nextChar).trim() !== '') {
    // baseOffset is already a valid offset
    return baseOffset;
  }

  let availableChars: string;
  let availableNonWhitespaceChars: string;

  if (direction === FromPosition.END) {
    availableChars = text.substring(0, baseOffset);
    availableNonWhitespaceChars = availableChars.trimEnd();
  } else {
    availableChars = text.substring(baseOffset);
    availableNonWhitespaceChars = availableChars.trimStart();
  }

  if (!availableNonWhitespaceChars.length) {
    return -1;
  }

  const offsetDelta =
    availableChars.length - availableNonWhitespaceChars.length;

  return direction === FromPosition.END
    ? baseOffset - offsetDelta
    : baseOffset + offsetDelta;
}

type TrimTextContainerOptions = {
  direction?: FromPosition;
  root?: Node;
};

/**
 * Return a Node and numerical offset representing the nearest non-whitespace
 * character to `container`, moving toward `boundaryContainer`.
 *
 * Iterate through text nodes in the `direction` indicated toward
 * `boundaryContainer` from `container`, looking for the first text node that
 * has non-whitespace text content in it. Return that node, and an offset that
 * references either the first non-whitespace character (when direction is
 * FromPosition.START) or the last (direction is FromPosition.END) within that
 * node.
 *
 * @throws {RangeError} If no text node with non-whitespace characters found
 * between `container` and `boundaryContainer`
 */
function trimTextContainer(
  container: Text,
  boundaryContainer: Text,
  { direction = FromPosition.START, root }: TrimTextContainerOptions
) {
  const nodeIter = container.ownerDocument!.createNodeIterator(
    root ?? container,
    NodeFilter.SHOW_TEXT
  );
  let currentNode = nodeIter.nextNode();

  while (currentNode && currentNode !== container) {
    currentNode = nodeIter.nextNode();
  }

  if (direction === FromPosition.END) {
    // Reverse the NodeIterator direction. This will return the same node
    // as the previous `nextNode()` call (`container`).
    currentNode = nodeIter.previousNode();
  }

  let trimmedOffset = -1;

  const advance = () => {
    currentNode =
      direction === FromPosition.START
        ? nodeIter.nextNode()
        : nodeIter.previousNode();

    if (currentNode) {
      const nodeText = currentNode.textContent ?? '';
      const baseOffset = direction === FromPosition.START ? 0 : nodeText.length;
      trimmedOffset = trimTextOffset(nodeText, baseOffset, direction);
    }
  };

  // Start the examination at the first text node before/after the `container`
  // i.e. do not evaluate the `container` itself
  advance();

  while (
    currentNode &&
    trimmedOffset === -1 &&
    currentNode !== boundaryContainer
  ) {
    advance();
  }

  if (currentNode && trimmedOffset >= 0) {
    return { node: currentNode, offset: trimmedOffset };
  } else {
    throw new RangeError(
      'No text nodes with non-whitespace text found in range'
    );
  }
}

/**
 * Return a new DOM Range that trims `range`, ensuring that:
 *
 * - `startContainer` and `endContainer` Text nodes both contain at least one
 *   non-whitespace character within the Range's text content
 * - `startOffset` and `endOffset` both point at non-whitespace characters
 */
export function trimRange(range: Range): Range {
  if (!range.toString().trim().length) {
    throw new RangeError('Range contains no non-whitespace text');
  }
  if (range.startContainer.nodeType !== Node.TEXT_NODE) {
    throw new RangeError('Range startContainer is not a text node');
  }
  if (range.endContainer.nodeType !== Node.TEXT_NODE) {
    throw new RangeError('Range endContainer is not a text node');
  }

  const trimmedRange = range.cloneRange();

  let startTrimmed = false;
  let endTrimmed = false;

  const nodeText = (node: Node) => {
    return (node as Text).textContent ?? '';
  };

  const trimmedOffsets = {
    start: trimTextOffset(
      nodeText(range.startContainer),
      range.startOffset,
      FromPosition.START
    ),
    end: trimTextOffset(
      nodeText(range.endContainer),
      range.endOffset,
      FromPosition.END
    ),
  };

  if (trimmedOffsets.start >= 0) {
    if (trimmedOffsets.start !== range.startOffset) {
      trimmedRange.setStart(range.startContainer, trimmedOffsets.start);
    }
    startTrimmed = true;
  }

  // Note: An offset of 0 is invalid for an end offset, as no text in the
  // node would be included in the range.
  if (trimmedOffsets.end > 0) {
    if (trimmedOffsets.end !== range.endOffset) {
      trimmedRange.setEnd(range.endContainer, trimmedOffsets.end);
    }
    endTrimmed = true;
  }

  if (startTrimmed && endTrimmed) {
    return trimmedRange;
  }

  if (!startTrimmed) {
    // There are no (non-whitespace) characters between `startOffset` and the
    // end of the `startContainer` node.
    const { node, offset } = trimTextContainer(
      trimmedRange.startContainer as Text,
      trimmedRange.endContainer as Text,
      {
        direction: FromPosition.START,
        root: trimmedRange.commonAncestorContainer,
      }
    );

    if (node && offset >= 0) {
      trimmedRange.setStart(node, offset);
    }
  }

  if (!endTrimmed) {
    // There are no (non-whitespace) characters between the start of the Range's
    // `endContainer` text content and the `endOffset`.
    const { node, offset } = trimTextContainer(
      trimmedRange.endContainer as Text,
      trimmedRange.startContainer as Text,
      {
        direction: FromPosition.END,
        root: trimmedRange.commonAncestorContainer,
      }
    );

    if (node && offset > 0) {
      trimmedRange.setEnd(node, offset);
    }
  }

  return trimmedRange;
}
