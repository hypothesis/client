import $ from 'jquery';

import { xpathFromNode } from './range-js';
import { SerializedRange } from './range-serialized';
import { getTextNodes } from './xpath-util';

/**
 * Public: A normalized range is most commonly used throughout the annotator.
 * its the result of a deserialized SerializedRange or a BrowserRange with
 * out browser inconsistencies.
 */
export default class NormalizedRange {
  /**
   * Public: Creates an instance of a NormalizedRange.
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
   * Public: For API consistency.
   *
   * Returns itself.
   */
  normalize() {
    return this;
  }

  /**
   * Public: Limits the nodes within the NormalizedRange to those contained
   * withing the bounds parameter. It returns an updated range with all
   * properties updated. NOTE: Method returns null if all nodes fall outside
   * of the bounds.
   *
   * bounds - An Element to limit the range to.
   *
   * Returns updated self or null.
   */
  limit(bounds) {
    const nodes = $.grep(
      this.textNodes(),
      node => node.parentNode === bounds || $.contains(bounds, node.parentNode)
    );
    if (!nodes.length) {
      return null;
    }

    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];

    const startParents = $(this.start).parents();

    for (let parent of Array.from($(this.end).parents())) {
      if (startParents.index(parent) !== -1) {
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
   * ignoreSelector - A selector String of elements to ignore. For example
   *                  elements injected by the annotator.
   *
   * Returns an instance of SerializedRange.
   */
  serialize(root, ignoreSelector) {
    const serialization = function (node, isEnd) {
      let origParent;
      if (ignoreSelector) {
        origParent = $(node).parents(`:not(${ignoreSelector})`).eq(0);
      } else {
        origParent = $(node).parent();
      }
      const xpath = xpathFromNode(origParent, root)[0];
      const textNodes = getTextNodes(origParent);
      //console.log('3')
      // Calculate real offset as the combined length of all the
      // preceding textNode siblings. We include the length of the
      // node if it's the end node.
      const nodes = textNodes.slice(0, textNodes.index(node));
      let offset = 0;
      for (let n of Array.from(nodes)) {
        offset += n.nodeValue.length;
      }

      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };

    const start = serialization(this.start);
    const end = serialization(this.end, true);

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
   * Public: Creates a concatenated String of the contents of all the text nodes
   * within the range.
   *
   * Returns a String.
   */
  text() {
    return Array.from(this.textNodes())
      .map(node => node.nodeValue)
      .join('');
  }

  /**
   * Public: Fetches only the text nodes within the range.
   *
   * Returns an Array of TextNode instances.
   */
  textNodes() {
    const textNodes = getTextNodes($(this.commonAncestor));
    const [start, end] = Array.from([
      textNodes.index(this.start),
      textNodes.index(this.end),
    ]);
    // Return the textNodes that fall between the start and end indexes.
    return $.makeArray(textNodes.slice(start, +end + 1 || undefined));
  }

  /**
   * Public: Converts the Normalized range to a native browser range.
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
