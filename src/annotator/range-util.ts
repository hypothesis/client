import { nodeIsText } from './util/node';

/**
 * Return a range that spans from the earlier of a or b's start point to
 * the later of a or b's end point, in document order.
 */
function unionRanges(a: Range, b: Range): Range {
  const result = new Range();

  if (a.compareBoundaryPoints(Range.START_TO_START, b) <= 0) {
    result.setStart(a.startContainer, a.startOffset);
  } else {
    result.setStart(b.startContainer, b.startOffset);
  }

  if (a.compareBoundaryPoints(Range.END_TO_END, b) >= 0) {
    result.setEnd(a.endContainer, a.endOffset);
  } else {
    result.setEnd(b.endContainer, b.endOffset);
  }

  return result;
}

/**
 * Return the currently selected {@link Range} or `null` if there is no
 * selection.
 */
export function selectedRange(
  selection: Selection | null = document.getSelection()
): Range | null {
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  let range = selection.getRangeAt(0);

  // Work around a Firefox issue [1] where a selection can have multiple ranges,
  // in contradiction to the Selection API [2] spec. The workaround is to
  // union the ranges to produce the same single range as other browsers.
  //
  // [1] https://bugzilla.mozilla.org/show_bug.cgi?id=1773065
  // [2] https://w3c.github.io/selection-api/#dom-selection-rangecount
  for (let i = 1; i < selection.rangeCount; i++) {
    range = unionRanges(range, selection.getRangeAt(i));
  }

  if (range.collapsed) {
    return null;
  }
  return range;
}

/**
 * Returns true if the start point of a selection occurs after the end point,
 * in document order.
 */
export function isSelectionBackwards(selection: Selection) {
  if (selection.focusNode === selection.anchorNode) {
    return selection.focusOffset < selection.anchorOffset;
  }

  const range = selectedRange(selection)!;

  // Does not work correctly on iOS when selecting nodes backwards.
  // https://bugs.webkit.org/show_bug.cgi?id=220523
  return range.startContainer === selection.focusNode;
}

/**
 * Returns true if any part of `node` lies within `range`.
 */
export function isNodeInRange(range: Range, node: Node) {
  try {
    const length = node.nodeValue?.length ?? node.childNodes.length;
    return (
      // Check start of node is before end of range.
      range.comparePoint(node, 0) <= 0 &&
      // Check end of node is after start of range.
      range.comparePoint(node, length) >= 0
    );
  } catch (e) {
    // `comparePoint` may fail if the `range` and `node` do not share a common
    // ancestor or `node` is a doctype.
    return false;
  }
}

/**
 * Iterate over all Node(s) which overlap `range` in document order and invoke
 * `callback` for each of them.
 */
export function forEachNodeInRange(range: Range, callback: (n: Node) => void) {
  const root = range.commonAncestorContainer;
  const nodeIter: NodeIterator = root.ownerDocument!.createNodeIterator(
    root,
    NodeFilter.SHOW_ALL
  );

  let currentNode;
  while ((currentNode = nodeIter.nextNode())) {
    if (isNodeInRange(range, currentNode)) {
      callback(currentNode);
    }
  }
}

function textNodeContainsText(textNode: Text): boolean {
  const whitespaceOnly = /^\s*$/;
  return !textNode.textContent!.match(whitespaceOnly);
}

/**
 * Returns the bounding rectangles of non-whitespace text nodes in `range`.
 *
 * @return Array of bounding rects in viewport coordinates.
 */
export function getTextBoundingBoxes(range: Range): DOMRect[] {
  const textNodes: Text[] = [];
  forEachNodeInRange(range, node => {
    if (nodeIsText(node) && textNodeContainsText(node)) {
      textNodes.push(node);
    }
  });

  return textNodes.flatMap(node => {
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
      return [];
    }

    // Measure the range and translate from viewport to document coordinates
    const viewportRects = Array.from(nodeRange.getClientRects());
    nodeRange.detach();
    return viewportRects;
  });
}

/**
 * Returns the rectangle, in viewport coordinates, for the line of text
 * containing the focus point of a Selection.
 *
 * Returns null if the selection is empty.
 */
export function selectionFocusRect(selection: Selection): DOMRect | null {
  const range = selectedRange(selection);
  if (!range) {
    return null;
  }
  const textBoxes = getTextBoundingBoxes(range);
  if (textBoxes.length === 0) {
    return null;
  }

  if (isSelectionBackwards(selection)) {
    return textBoxes[0];
  } else {
    return textBoxes[textBoxes.length - 1];
  }
}

/**
 * Retrieve a set of items associated with nodes in a given range.
 *
 * An `item` can be any data that the caller wishes to compute from or associate
 * with a node. Only unique items, as determined by `Object.is`, are returned.
 *
 * @param itemForNode - Callback returning the item for a given node
 */
export function itemsForRange<T>(
  range: Range,
  itemForNode: (n: Node) => NonNullable<T> | null | undefined
): NonNullable<T>[] {
  const checkedNodes = new Set<Node>();
  const items = new Set<NonNullable<T>>();

  forEachNodeInRange(range, (current: Node | null) => {
    while (current) {
      if (checkedNodes.has(current)) {
        break;
      }
      checkedNodes.add(current);

      const item = itemForNode(current);
      if (item !== null && item !== undefined) {
        items.add(item);
      }

      current = current.parentNode;
    }
  });

  return [...items];
}
