import { xpathFromNode, nodeFromXPath } from './xpath';
import {
  getFirstTextNodeNotBefore,
  getLastTextNodeUpTo,
  getTextNodes,
} from './xpath-util';

/**
 * Return ancestors of `node`.
 *
 * @param {Node} node
 */
function parents(node) {
  const parents = [];
  while (node.parentElement) {
    parents.push(node.parentElement);
    node = node.parentElement;
  }
  return parents;
}

/**
 * Creates a wrapper around a range object obtained from a DOMSelection.
 */
export class BrowserRange {
  /**
   * Creates an instance of BrowserRange.
   *
   * object - A range object obtained via DOMSelection#getRangeAt().
   *
   * Examples
   *
   *   selection = window.getSelection()
   *   range = new Range.BrowserRange(selection.getRangeAt(0))
   *
   * Returns an instance of BrowserRange.
   */
  constructor(obj) {
    this.commonAncestorContainer = obj.commonAncestorContainer;
    this.startContainer = obj.startContainer;
    this.startOffset = obj.startOffset;
    this.endContainer = obj.endContainer;
    this.endOffset = obj.endOffset;
    this.tainted = false;
  }

  /**
   * normalize works around the fact that browsers don't generate
   * ranges/selections in a consistent manner. Some (Safari) will create
   * ranges that have (say) a textNode startContainer and elementNode
   * endContainer. Others (Firefox) seem to only ever generate
   * textNode/textNode or elementNode/elementNode pairs.
   *
   * Returns an instance of NormalizedRange
   */
  normalize() {
    if (this.tainted) {
      throw new Error('You may only call normalize() once on a BrowserRange!');
    } else {
      this.tainted = true;
    }
    const range = {};

    // Look at the start
    if (this.startContainer.nodeType === Node.ELEMENT_NODE) {
      // We are dealing with element nodes
      if (this.startOffset < this.startContainer.childNodes.length) {
        range.start = getFirstTextNodeNotBefore(
          this.startContainer.childNodes[this.startOffset]
        );
      } else {
        range.start = getFirstTextNodeNotBefore(this.startContainer);
      }
      range.startOffset = 0;
    } else {
      // We are dealing with simple text nodes
      range.start = this.startContainer;
      range.startOffset = this.startOffset;
    }

    // Look at the end
    if (this.endContainer.nodeType === Node.ELEMENT_NODE) {
      // Get specified node.
      let node = this.endContainer.childNodes[this.endOffset];
      // Does that node exist?
      if (node) {
        // Look for a text node either at the immediate beginning of node
        let n = node;
        while (n && n.nodeType !== Node.TEXT_NODE) {
          n = n.firstChild;
        }
        // Did we find a text node at the start of this element?
        if (n) {
          range.end = n;
          range.endOffset = 0;
        }
      }

      if (!range.end) {
        // We need to find a text node in the previous sibling of the node at the
        // given offset, if one exists, or in the previous sibling of its container.
        if (this.endOffset) {
          node = this.endContainer.childNodes[this.endOffset - 1];
        } else {
          node = this.endContainer.previousSibling;
        }
        range.end = getLastTextNodeUpTo(node);
        range.endOffset = range.end.nodeValue.length;
      }
    } else {
      // We are dealing with simple text nodes
      range.end = this.endContainer;
      range.endOffset = this.endOffset;
    }

    // We have collected the initial data.
    // Now let's start to slice & dice the text elements!
    const normalRange = {};

    if (range.startOffset > 0) {
      // Do we really have to cut?
      if (
        !range.start.nextSibling ||
        range.start.nodeValue.length > range.startOffset
      ) {
        // Yes. Cut.
        normalRange.start = range.start.splitText(range.startOffset);
      } else {
        // Avoid splitting off zero-length pieces.
        normalRange.start = getFirstTextNodeNotBefore(range.start.nextSibling);
      }
    } else {
      normalRange.start = range.start;
    }

    // Is the whole selection inside one text element?
    if (range.start === range.end) {
      if (
        normalRange.start.nodeValue.length >
        range.endOffset - range.startOffset
      ) {
        normalRange.start.splitText(range.endOffset - range.startOffset);
      }
      normalRange.end = normalRange.start;
    } else {
      // No, the end of the selection is in a separate text element
      // does the end need to be cut?
      if (range.end.nodeValue.length > range.endOffset) {
        range.end.splitText(range.endOffset);
      }
      normalRange.end = range.end;
    }

    // Make sure the common ancestor is an element node.
    normalRange.commonAncestor = this.commonAncestorContainer;
    while (normalRange.commonAncestor.nodeType !== Node.ELEMENT_NODE) {
      normalRange.commonAncestor = normalRange.commonAncestor.parentNode;
    }

    // Circular dependency. Remove this once *Range classes are refactored
    // eslint-disable-next-line no-use-before-define
    return new NormalizedRange(normalRange);
  }

  /**
   * Creates a range suitable for storage.
   *
   * root           - A root Element from which to anchor the serialization.
   *
   * Returns an instance of SerializedRange.
   */
  serialize(root) {
    return this.normalize().serialize(root);
  }
}

/**
 * A normalized range is most commonly used throughout the annotator.
 * its the result of a deserialized SerializedRange or a BrowserRange without
 * browser inconsistencies.
 */
export class NormalizedRange {
  /**
   * Creates an instance of a NormalizedRange.
   *
   * This is usually created by calling the .normalize() method on one of the
   * other Range classes rather than manually.
   *
   * obj - An Object literal. Should have the following properties.
   *       commonAncestor: A Element that encompasses both the start and end nodes
   *       start:          The first TextNode in the range.
   *       end             The last TextNode in the range.
   *
   * Returns an instance of NormalizedRange.
   */
  constructor(obj) {
    this.commonAncestor = obj.commonAncestor;
    this.start = obj.start;
    this.end = obj.end;
  }

  /**
   * For API consistency.
   *
   * Returns itself.
   */
  normalize() {
    return this;
  }

  /**
   * Limits the nodes within the NormalizedRange to those contained
   * withing the bounds parameter. It returns an updated range with all
   * properties updated. NOTE: Method returns null if all nodes fall outside
   * of the bounds.
   *
   * bounds - An Element to limit the range to.
   *
   * Returns updated self or null.
   */
  limit(bounds) {
    const nodes = this.textNodes().filter(node =>
      bounds.contains(node.parentNode)
    );
    if (!nodes.length) {
      return null;
    }

    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];

    const startParents = parents(this.start);

    for (let parent of parents(this.end)) {
      if (startParents.indexOf(parent) !== -1) {
        this.commonAncestor = parent;
        break;
      }
    }
    return this;
  }

  /**
   * Convert this range into an object consisting of two pairs of (xpath,
   * character offset), which can be easily stored in a database.
   *
   * root -           The root Element relative to which XPaths should be calculated
   *
   * Returns an instance of SerializedRange.
   */
  serialize(root) {
    const serialization = (node, isEnd) => {
      const origParent = node.parentElement;
      const xpath = xpathFromNode(origParent, root ?? document);
      const textNodes = getTextNodes(origParent);
      // Calculate real offset as the combined length of all the
      // preceding textNode siblings. We include the length of the
      // node if it's the end node.
      const nodes = textNodes.slice(0, textNodes.indexOf(node));
      let offset = 0;
      for (let n of nodes) {
        offset += n.data.length;
      }

      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };

    const start = serialization(this.start);
    const end = serialization(this.end, true);

    // Circular dependency. Remove this once *Range classes are refactored
    // eslint-disable-next-line no-use-before-define
    return new SerializedRange({
      // XPath strings
      start: start[0],
      end: end[0],
      // Character offsets (integer)
      startOffset: start[1],
      endOffset: end[1],
    });
  }

  /**
   * Creates a concatenated String of the contents of all the text nodes
   * within the range.
   *
   * Returns a String.
   */
  text() {
    return this.textNodes()
      .map(node => node.nodeValue)
      .join('');
  }

  /**
   * Fetches only the text nodes within the range.
   *
   * Returns an Array of TextNode instances.
   */
  textNodes() {
    const textNodes = getTextNodes(this.commonAncestor);
    const start = textNodes.indexOf(this.start);
    const end = textNodes.indexOf(this.end);
    // Return the textNodes that fall between the start and end indexes.
    return textNodes.slice(start, +end + 1 || undefined);
  }

  /**
   * Converts the Normalized range to a native browser range.
   *
   * See: https://developer.mozilla.org/en/DOM/range
   *
   * Examples
   *
   *   selection = window.getSelection()
   *   selection.removeAllRanges()
   *   selection.addRange(normedRange.toRange())
   *
   * Returns a Range object.
   */
  toRange() {
    const range = document.createRange();
    range.setStartBefore(this.start);
    range.setEndAfter(this.end);
    return range;
  }
}

/**
 * A range suitable for storing in local storage or serializing to JSON.
 */
export class SerializedRange {
  /**
   * Creates a SerializedRange
   *
   * obj - The stored object. It should have the following properties.
   *       start:       An xpath to the Element containing the first TextNode
   *                    relative to the root Element.
   *       startOffset: The offset to the start of the selection from obj.start.
   *       end:         An xpath to the Element containing the last TextNode
   *                    relative to the root Element.
   *       startOffset: The offset to the end of the selection from obj.end.
   *
   * Returns an instance of SerializedRange
   */
  constructor(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }

  /**
   * Creates a NormalizedRange.
   *
   * root - The root Element from which the XPaths were generated.
   *
   * Returns a NormalizedRange instance.
   */
  normalize(root) {
    const range = {};

    for (let p of ['start', 'end']) {
      let node;
      try {
        node = nodeFromXPath(this[p], root);
        if (!node) {
          throw new Error('Node not found');
        }
      } catch (e) {
        throw new RangeError(`Error while finding ${p} node: ${this[p]}: ` + e);
      }
      // Unfortunately, we *can't* guarantee only one textNode per
      // elementNode, so we have to walk along the element's textNodes until
      // the combined length of the textNodes to that point exceeds or
      // matches the value of the offset.
      let length = 0;
      let targetOffset = this[p + 'Offset'];

      // Range excludes its endpoint because it describes the boundary position.
      // Target the string index of the last character inside the range.
      if (p === 'end') {
        targetOffset--;
      }

      for (let tn of getTextNodes(node)) {
        if (length + tn.data.length > targetOffset) {
          range[p + 'Container'] = tn;
          range[p + 'Offset'] = this[p + 'Offset'] - length;
          break;
        } else {
          length += tn.data.length;
        }
      }

      // If we fall off the end of the for loop without having set
      // 'startOffset'/'endOffset', the element has shorter content than when
      // we annotated, so throw an error:
      if (range[p + 'Offset'] === undefined) {
        throw new RangeError(
          `Couldn't find offset ${this[p + 'Offset']} in element ${this[p]}`
        );
      }
    }

    for (let parent of parents(range.startContainer)) {
      if (parent.contains(range.endContainer)) {
        range.commonAncestorContainer = parent;
        break;
      }
    }

    return new BrowserRange(range).normalize();
  }

  /**
   * Creates a range suitable for storage.
   *
   * root           - A root Element from which to anchor the serialization.
   *
   * Returns an instance of SerializedRange.
   */
  serialize(root) {
    return this.normalize(root).serialize(root);
  }

  // Returns the range as an Object literal.
  toObject() {
    return {
      start: this.start,
      startOffset: this.startOffset,
      end: this.end,
      endOffset: this.endOffset,
    };
  }
}

/**
 * Determines the type of Range of the provided object and returns
 * a suitable Range instance.
 *
 * r - A range Object.
 *
 * Examples
 *
 *   selection = window.getSelection()
 *   Range.sniff(selection.getRangeAt(0))
 *   # => Returns a BrowserRange instance.
 *
 * Returns a Range object or false.
 */
export function sniff(range) {
  if (range.commonAncestorContainer !== undefined) {
    return new BrowserRange(range);
  } else if (typeof range.start === 'string') {
    return new SerializedRange(range);
  } else if (range.start && typeof range.start === 'object') {
    return new NormalizedRange(range);
  } else {
    throw new Error('Could not sniff range type');
  }
}
