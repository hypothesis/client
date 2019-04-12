'use strict';

/**
 * Returns true if the start point of a selection occurs after the end point,
 * in document order.
 */
function isSelectionBackwards(selection) {
  if (selection.focusNode === selection.anchorNode) {
    return selection.focusOffset < selection.anchorOffset;
  }

  const range = selection.getRangeAt(0);
  return range.startContainer === selection.focusNode;
}

/**
 * Returns true if `node` lies within a range.
 *
 * This is a simplified version of `Range.isPointInRange()` for compatibility
 * with IE.
 *
 * @param {Range} range
 * @param {Node} node
 */
function isNodeInRange(range, node) {
  if (node === range.startContainer || node === range.endContainer) {
    return true;
  }

  const nodeRange = node.ownerDocument.createRange();
  nodeRange.selectNode(node);
  const isAtOrBeforeStart =
    range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0;
  const isAtOrAfterEnd =
    range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
  nodeRange.detach();
  return isAtOrBeforeStart && isAtOrAfterEnd;
}

/**
 * Iterate over all Node(s) in `range` in document order and invoke `callback`
 * for each of them.
 *
 * @param {Range} range
 * @param {Function} callback
 */
function forEachNodeInRange(range, callback) {
  const root = range.commonAncestorContainer;

  // The `whatToShow`, `filter` and `expandEntityReferences` arguments are
  // mandatory in IE although optional according to the spec.
  const nodeIter = root.ownerDocument.createNodeIterator(
    root,
    NodeFilter.SHOW_ALL,
    null /* filter */,
    false /* expandEntityReferences */
  );

  let currentNode;
  while ((currentNode = nodeIter.nextNode())) {
    // eslint-disable-line no-cond-assign
    if (isNodeInRange(range, currentNode)) {
      callback(currentNode);
    }
  }
}

/**
 * Returns the bounding rectangles of non-whitespace text nodes in `range`.
 *
 * @param {Range} range
 * @return {Array<Rect>} Array of bounding rects in viewport coordinates.
 */
function getTextBoundingBoxes(range) {
  const whitespaceOnly = /^\s*$/;
  const textNodes = [];
  forEachNodeInRange(range, function(node) {
    if (
      node.nodeType === Node.TEXT_NODE &&
      !node.textContent.match(whitespaceOnly)
    ) {
      textNodes.push(node);
    }
  });

  let rects = [];
  textNodes.forEach(function(node) {
    const nodeRange = node.ownerDocument.createRange();
    nodeRange.selectNodeContents(node);
    if (node === range.startContainer) {
      nodeRange.setStart(node, range.startOffset);
    }
    if (node === range.endContainer) {
      nodeRange.setEnd(node, range.endOffset);
    }
    if (nodeRange.collapsed) {
      // If the range ends at the start of this text node or starts at the end
      // of this node then do not include it.
      return;
    }

    // Measure the range and translate from viewport to document coordinates
    const viewportRects = Array.from(nodeRange.getClientRects());
    nodeRange.detach();
    rects = rects.concat(viewportRects);
  });
  return rects;
}

/**
 * Returns the rectangle, in viewport coordinates, for the line of text
 * containing the focus point of a Selection.
 *
 * Returns null if the selection is empty.
 *
 * @param {Selection} selection
 * @return {Rect|null}
 */
function selectionFocusRect(selection) {
  if (selection.isCollapsed) {
    return null;
  }
  const textBoxes = getTextBoundingBoxes(selection.getRangeAt(0));
  if (textBoxes.length === 0) {
    return null;
  }

  if (isSelectionBackwards(selection)) {
    return textBoxes[0];
  } else {
    return textBoxes[textBoxes.length - 1];
  }
}

module.exports = {
  getTextBoundingBoxes: getTextBoundingBoxes,
  isNodeInRange: isNodeInRange,
  isSelectionBackwards: isSelectionBackwards,
  selectionFocusRect: selectionFocusRect,
};
