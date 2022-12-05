/**
 * Return the combined length of text nodes contained in `node`.
 */
function nodeTextLength(node: Node): number {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.TEXT_NODE:
      // nb. `textContent` excludes text in comments and processing instructions
      // when called on a parent element, so we don't need to subtract that here.

      return node.textContent?.length ?? 0;
    default:
      return 0;
  }
}

/**
 * Return the total length of the text of all previous siblings of `node`.
 */
function previousSiblingsTextLength(node: Node): number {
  let sibling = node.previousSibling;
  let length = 0;
  while (sibling) {
    length += nodeTextLength(sibling);
    sibling = sibling.previousSibling;
  }
  return length;
}

/**
 * Resolve one or more character offsets within an element to (text node,
 * position) pairs.
 *
 * @param element
 * @param offsets - Offsets, which must be sorted in ascending order
 * @throws {RangeError}
 */
function resolveOffsets(
  element: Element,
  ...offsets: number[]
): { node: Text; offset: number }[] {
  let nextOffset = offsets.shift();
  const nodeIter = element.ownerDocument.createNodeIterator(
    element,
    NodeFilter.SHOW_TEXT
  );
  const results = [];

  let currentNode = nodeIter.nextNode() as Text;
  let textNode;
  let length = 0;

  // Find the text node containing the `nextOffset`th character from the start
  // of `element`.
  while (nextOffset !== undefined && currentNode) {
    textNode = currentNode;
    if (length + textNode.data.length > nextOffset) {
      results.push({ node: textNode, offset: nextOffset - length });
      nextOffset = offsets.shift();
    } else {
      currentNode = nodeIter.nextNode() as Text;
      length += textNode.data.length;
    }
  }

  // Boundary case.
  while (nextOffset !== undefined && textNode && length === nextOffset) {
    results.push({ node: textNode, offset: textNode.data.length });
    nextOffset = offsets.shift();
  }

  if (nextOffset !== undefined) {
    throw new RangeError('Offset exceeds text length');
  }

  return results;
}

/**
 * When resolving a TextPosition, specifies the direction to search for the
 * nearest text node if `offset` is `0` and the element has no text.
 */
export enum ResolveDirection {
  FORWARDS = 1,
  BACKWARDS,
}

/**
 * Represents an offset within the text content of an element.
 *
 * This position can be resolved to a specific descendant node in the current
 * DOM subtree of the element using the `resolve` method.
 */
export class TextPosition {
  public element: Element;
  public offset: number;

  constructor(element: Element, offset: number) {
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
   * element .
   *
   * @param parent - Ancestor of `this.element`
   */
  relativeTo(parent: Element): TextPosition {
    if (!parent.contains(this.element)) {
      throw new Error('Parent is not an ancestor of current element');
    }

    let el = this.element;
    let offset = this.offset;
    while (el !== parent) {
      offset += previousSiblingsTextLength(el);
      el = el.parentElement!;
    }

    return new TextPosition(el, offset);
  }

  /**
   * Resolve the position to a specific text node and offset within that node.
   *
   * Throws if `this.offset` exceeds the length of the element's text. In the
   * case where the element has no text and `this.offset` is 0, the `direction`
   * option determines what happens.
   *
   * Offsets at the boundary between two nodes are resolved to the start of the
   * node that begins at the boundary.
   *
   * @param options.direction - Direction to look for an adjacent text node if a
   * resolved offset is invalid (`resolveOffsets` throws). If not provided, an
   * error is thrown in these cases.
   *
   * @throws {RangeError}
   */
  resolve(options: { direction?: ResolveDirection } = {}): {
    node: Text;
    offset: number;
  } {
    try {
      return resolveOffsets(this.element, this.offset)[0];
    } catch (err) {
      if (this.offset === 0 && options.direction !== undefined) {
        const tw = document.createTreeWalker(
          this.element.getRootNode(),
          NodeFilter.SHOW_TEXT
        );
        tw.currentNode = this.element;
        const forwards = options.direction === ResolveDirection.FORWARDS;
        const text = forwards
          ? (tw.nextNode() as Text | null)
          : (tw.previousNode() as Text | null);
        if (!text) {
          throw err;
        }
        return { node: text, offset: forwards ? 0 : text.data.length };
      } else {
        throw err;
      }
    }
  }

  /**
   * Construct a `TextPosition` that refers to the `offset`th character within
   * `node`.
   */
  static fromCharOffset(node: Node, offset: number): TextPosition {
    switch (node.nodeType) {
      case Node.TEXT_NODE:
        return TextPosition.fromPoint(node, offset);
      case Node.ELEMENT_NODE:
        return new TextPosition(node as Element, offset);
      default:
        throw new Error('Node is not an element or text node');
    }
  }

  /**
   * Construct a `TextPosition` representing the range start or end point (node, offset).
   *
   * @param node
   * @param offset - Offset within the node
   */
  static fromPoint(node: Node, offset: number): TextPosition {
    switch (node.nodeType) {
      case Node.TEXT_NODE: {
        if (offset < 0 || offset > (node as Text).data.length) {
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
          textOffset += nodeTextLength(node.childNodes[i]);
        }

        return new TextPosition(node as Element, textOffset);
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
  public start: TextPosition;
  public end: TextPosition;

  constructor(start: TextPosition, end: TextPosition) {
    this.start = start;
    this.end = end;
  }

  /**
   * Create a new TextRange relative to `element`.
   *
   * Return a new TextRange whose `start` and `end` are computed relative to
   * `element`. `element` must be an ancestor of both `start.element` and
   * `end.element`.
   */
  relativeTo(element: Element): TextRange {
    return new TextRange(
      this.start.relativeTo(element),
      this.end.relativeTo(element)
    );
  }

  /**
   * Resolve this TextRange to a (DOM) Range.
   *
   * The resulting DOM Range will always start and end in a `Text` node.
   * Hence `TextRange.fromRange(range).toRange()` can be used to "shrink" a
   * range to the text it contains.
   *
   * May throw if the `start` or `end` positions cannot be resolved to a range.
   */
  toRange(): Range {
    let start;
    let end;

    if (
      this.start.element === this.end.element &&
      this.start.offset <= this.end.offset
    ) {
      // Fast path for start and end points in same element.
      [start, end] = resolveOffsets(
        this.start.element,
        this.start.offset,
        this.end.offset
      );
    } else {
      start = this.start.resolve({
        direction: ResolveDirection.FORWARDS,
      });
      end = this.end.resolve({ direction: ResolveDirection.BACKWARDS });
    }

    const range = new Range();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  }

  /**
   * Create a TextRange from a (DOM) Range
   */
  static fromRange(range: Range): TextRange {
    const start = TextPosition.fromPoint(
      range.startContainer,
      range.startOffset
    );
    const end = TextPosition.fromPoint(range.endContainer, range.endOffset);
    return new TextRange(start, end);
  }

  /**
   * Create a TextRange representing the `start`th to `end`th characters in
   * `root`
   */
  static fromOffsets(root: Element, start: number, end: number): TextRange {
    return new TextRange(
      new TextPosition(root, start),
      new TextPosition(root, end)
    );
  }
}
