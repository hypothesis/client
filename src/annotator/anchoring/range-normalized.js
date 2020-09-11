import $ from 'jquery';

import { getTextNodes } from './xpath-util';

/**
 * Public: A normalized range is most commonly used throughout the annotator.
 * its the result of a deserialized SerializedRange or a BrowserRange with
 * out browser inconsistencies.
 */
export class NormalizedRange {
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
