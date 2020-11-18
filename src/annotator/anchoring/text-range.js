/**
 * Return the total length of the text of all previous siblings of `node`.
 *
 * @param {Node} node
 */
function previousSiblingsTextLength(node) {
  let sibling = node.previousSibling;
  let length = 0;
  while (sibling) {
    length += sibling.textContent?.length ?? 0;
    sibling = sibling.previousSibling;
  }
  return length;
}

/**
 * Represents an offset within the text content of an element.
 *
 * This position can be resolved to a specific descendant node in the current
 * DOM subtree of the element using the `resolve` method.
 */
export class TextPosition {
  /**
   * Construct a `TextPosition` that refers to the text position `offset` within
   * the text content of `element`.
   *
   * @param {Element} element
   * @param {number} offset
   */
  constructor(element, offset) {
    if (offset < 0) {
      throw new Error('Offset is invalid');
    }

    /** Element that `offset` is relative to. */
    this.element = element;

    /** Character offset from the start of the element's `textContent`. */
    this.offset = offset;
  }

  /**
   * Return a copy of this position with offset relative to a given ancestor
   * element.
   *
   * @param {Element} parent - Ancestor of `this.element`
   * @return {TextPosition}
   */
  relativeTo(parent) {
    if (!parent.contains(this.element)) {
      throw new Error('Parent is not an ancestor of current element');
    }

    let el = this.element;
    let offset = this.offset;
    while (el !== parent) {
      offset += previousSiblingsTextLength(el);
      el = /** @type {Element} */ (el.parentElement);
    }

    return new TextPosition(el, offset);
  }

  /**
   * Resolve the position to a specific text node and offset within that node.
   *
   * Throws if `this.offset` exceeds the length of the element's text or if
   * the element has no text. Offsets at the boundary between two nodes are
   * resolved to the start of the node that begins at the boundary.
   *
   * @return {{ node: Text, offset: number }}
   * @throws {RangeError}
   */
  resolve() {
    const root = this.element;
    const nodeIter = /** @type {Document} */ (root.ownerDocument).createNodeIterator(
      root,
      NodeFilter.SHOW_TEXT
    );

    let currentNode;
    let textNode;
    let length = 0;

    // Find the text node containing the `this.offset`th character from the start
    // of `this.element`.
    while ((currentNode = nodeIter.nextNode())) {
      textNode = /** @type {Text} */ (currentNode);
      if (length + textNode.data.length > this.offset) {
        return { node: textNode, offset: this.offset - length };
      }
      length += textNode.data.length;
    }

    // Boundary case.
    if (textNode && length === this.offset) {
      return { node: textNode, offset: textNode.data.length };
    }

    throw new RangeError('Offset exceeds text length');
  }

  /**
   * Construct a `TextPosition` representing the range start or end point (node, offset).
   *
   * @param {Node} node
   * @param {number} offset
   * @return {TextPosition}
   */
  static fromPoint(node, offset) {
    switch (node.nodeType) {
      case Node.TEXT_NODE: {
        if (offset < 0 || offset > /** @type {Text} */ (node).data.length) {
          throw new Error('Text node offset is out of range');
        }

        if (!node.parentElement) {
          throw new Error('Text node has no parent');
        }

        // Get the offset from the start of the parent element.
        const textOffset = previousSiblingsTextLength(node) + offset;

        return new TextPosition(node.parentElement, textOffset);
      }
      case Node.ELEMENT_NODE: {
        if (offset < 0 || offset > node.childNodes.length) {
          throw new Error('Child node offset is out of range');
        }

        // Get the text length before the `offset`th child of element.
        let textOffset = 0;
        for (let i = 0; i < offset; i++) {
          textOffset += node.childNodes[i].textContent?.length ?? 0;
        }

        return new TextPosition(/** @type {Element} */ (node), textOffset);
      }
      default:
        throw new Error('Point is not in an element or text node');
    }
  }
}

/**
 * Represents a region of a document as a (start, end) pair of `TextPosition` points.
 *
 * Representing a range in this way allows for changes in the DOM content of the
 * range which don't affect its text content, without affecting the text content
 * of the range itself.
 */
export class TextRange {
  /**
   * Construct an immutable `TextRange` from a `start` and `end` point.
   *
   * @param {TextPosition} start
   * @param {TextPosition} end
   */
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
   * Resolve the `TextRange` to a DOM range.
   *
   * The resulting DOM Range will always start and end in a `Text` node.
   * Hence `TextRange.fromRange(range).toRange()` can be used to "shrink" a
   * range to the text it contains.
   *
   * May throw if the `start` or `end` positions cannot be resolved to a range.
   *
   * @return {Range}
   */
  toRange() {
    const { node: startNode, offset: startOffset } = this.start.resolve();
    const { node: endNode, offset: endOffset } = this.end.resolve();

    const range = new Range();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  /**
   * Convert an existing DOM `Range` to a `TextRange`
   *
   * @param {Range} range
   * @return {TextRange}
   */
  static fromRange(range) {
    const start = TextPosition.fromPoint(
      range.startContainer,
      range.startOffset
    );
    const end = TextPosition.fromPoint(range.endContainer, range.endOffset);
    return new TextRange(start, end);
  }
}
