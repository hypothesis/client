import $ from 'jquery';

import { BrowserRange } from './range-browser';
import { NormalizedRange } from './range-normalized';
import { nodeFromXPath } from './range-js';
import { SerializedRange } from './range-serialized';
import {
  getFirstTextNodeNotBefore,
  getLastTextNodeUpTo,
  getTextNodes,
} from './xpath-util';

/**
 * Convert a BrowserRange or SerializedRange instance to a new NormalizedRange instance.
 * Passing a NormalizedRange instance range param will return itself.
 */
export function normalize(range, root) {
  // BrowserRange
  if (range instanceof BrowserRange) {
    // Works around the fact that browsers don't generate
    // ranges/selections in a consistent manner. Some (Safari) will create
    // ranges that have (say) a textNode startContainer and elementNode
    // endContainer. Others (Firefox) seem to only ever generate
    // textNode/textNode or elementNode/elementNode pairs.
    if (range.tainted) {
      throw new Error('You may only call normalize() once on a BrowserRange!');
    } else {
      range.tainted = true;
    }
    const rangeTemp = {};
    // Look at the start
    if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      // We are dealing with element nodes
      if (range.startOffset < range.startContainer.childNodes.length) {
        rangeTemp.start = getFirstTextNodeNotBefore(
          range.startContainer.childNodes[range.startOffset]
        );
      } else {
        rangeTemp.start = getFirstTextNodeNotBefore(range.startContainer);
      }
      rangeTemp.startOffset = 0;
    } else {
      // We are dealing with simple text nodes
      rangeTemp.start = range.startContainer;
      rangeTemp.startOffset = range.startOffset;
    }

    // Look at the end
    if (range.endContainer.nodeType === Node.ELEMENT_NODE) {
      // Get specified node.
      let node = range.endContainer.childNodes[range.endOffset];
      // Does that node exist?
      if (node) {
        // Look for a text node either at the immediate beginning of node
        let n = node;
        while (n && n.nodeType !== Node.TEXT_NODE) {
          n = n.firstChild;
        }
        // Did we find a text node at the start of this element?
        if (n) {
          rangeTemp.end = n;
          rangeTemp.endOffset = 0;
        }
      }

      if (!rangeTemp.end) {
        // We need to find a text node in the previous sibling of the node at the
        // given offset, if one exists, or in the previous sibling of its container.
        if (range.endOffset) {
          node = range.endContainer.childNodes[range.endOffset - 1];
        } else {
          node = range.endContainer.previousSibling;
        }
        rangeTemp.end = getLastTextNodeUpTo(node);
        rangeTemp.endOffset = rangeTemp.end.nodeValue.length;
      }
    } else {
      // We are dealing with simple text nodes
      rangeTemp.end = range.endContainer;
      rangeTemp.endOffset = range.endOffset;
    }

    // We have collected the initial data.
    // Now let's start to slice & dice the text elements!
    const normalRange = {};
    if (rangeTemp.startOffset > 0) {
      // Do we really have to cut?
      if (
        !rangeTemp.start.nextSibling ||
        rangeTemp.start.nodeValue.length > rangeTemp.startOffset
      ) {
        // Yes. Cut.
        normalRange.start = rangeTemp.start.splitText(rangeTemp.startOffset);
      } else {
        // Avoid splitting off zero-length pieces.
        normalRange.start = getFirstTextNodeNotBefore(
          rangeTemp.start.nextSibling
        );
      }
    } else {
      normalRange.start = rangeTemp.start;
    }

    // Is the whole selection inside one text element ?
    if (rangeTemp.start === rangeTemp.end) {
      if (
        normalRange.start.nodeValue.length >
        rangeTemp.endOffset - rangeTemp.startOffset
      ) {
        normalRange.start.splitText(
          rangeTemp.endOffset - rangeTemp.startOffset
        );
      }
      normalRange.end = normalRange.start;
    } else {
      // No, the end of the selection is in a separate text element
      // does the end need to be cut?
      if (rangeTemp.end.nodeValue.length > rangeTemp.endOffset) {
        rangeTemp.end.splitText(rangeTemp.endOffset);
      }
      normalRange.end = rangeTemp.end;
    }

    // Make sure the common ancestor is an element node.
    normalRange.commonAncestor = range.commonAncestorContainer;
    while (normalRange.commonAncestor.nodeType !== Node.ELEMENT_NODE) {
      normalRange.commonAncestor = normalRange.commonAncestor.parentNode;
    }
    return new NormalizedRange(normalRange);
  }

  // NormalizedRange
  else if (range instanceof NormalizedRange) {
    return range;
  }

  // SerializedRange
  else if (range instanceof SerializedRange) {
    const normalRange = {};
    for (let p of ['start', 'end']) {
      let node;
      try {
        node = nodeFromXPath(range[p], root);
      } catch (e) {
        throw new RangeError(
          `Error while finding ${p} node: ${range[p]}: ` + e
        );
      }

      if (!node) {
        throw new RangeError(`Couldn't find ${p} node: ${range[p]}`);
      }

      // Unfortunately, we *can't* guarantee only one textNode per
      // elementNode, so we have to walk along the element's textNodes until
      // the combined length of the textNodes to that point exceeds or
      // matches the value of the offset.
      let length = 0;
      let targetOffset = range[p + 'Offset'];

      // Range excludes its endpoint because it describes the boundary position.
      // Target the string index of the last character inside the range.
      if (p === 'end') {
        targetOffset--;
      }

      for (let tn of Array.from(getTextNodes($(node)))) {
        if (length + tn.nodeValue.length > targetOffset) {
          normalRange[p + 'Container'] = tn;
          normalRange[p + 'Offset'] = range[p + 'Offset'] - length;
          break;
        } else {
          length += tn.nodeValue.length;
        }
      }

      // If we fall off the end of the for loop without having set
      // 'startOffset'/'endOffset', the element has shorter content than when
      // we annotated, so throw an error:
      if (normalRange[p + 'Offset'] === undefined) {
        throw new RangeError(
          `Couldn't find offset ${range[p + 'Offset']} in element ${range[p]}`
        );
      }
    }

    // Here's an elegant next step...
    //
    //   normalRange.commonAncestorContainer = $(normalRange.startContainer).parents().has(normalRange.endContainer)[0]
    //
    // ...but unfortunately Node.contains() is broken in Safari 5.1.5 (7534.55.3)
    // and presumably other earlier versions of WebKit. In particular, in a
    // document like
    //
    //   <p>Hello</p>
    //
    // the code
    //
    //   p = document.getElementsByTagName('p')[0]
    //   p.contains(p.firstChild)
    //
    // returns `false`. Yay.
    //
    // So instead, we step through the parents from the bottom up and use
    // Node.compareDocumentPosition() to decide when to set the
    // commonAncestorContainer and bail out.
    const contains = (a, b) => a.compareDocumentPosition(b) & 16;
    $(normalRange.startContainer)
      .parents()
      .each(function () {
        if (contains(this, normalRange.endContainer)) {
          normalRange.commonAncestorContainer = this;
          // bail out of loop
          return false;
        }
        return true;
      });

    //console.log('calling BrowserRange() on', normalRange);
    return normalize(new BrowserRange(normalRange), root);
  } else {
    throw new Error('Could not normalize unknown range type');
  }
}
