import $ from 'jquery';

import { normalize } from './normalize';
import { BrowserRange } from './range-browser';
import { xpathFromNode } from './range-js';
import { NormalizedRange } from './range-normalized';
import { SerializedRange } from './range-serialized';
import { getTextNodes } from './xpath-util';

/**
 * Convert a BrowserRange or NormalizedRange instance to a new SerializedRange instance,
 * or a SerializedRange instance can be re-serialized to a new SerializedRange instance
 * augmented with a with a provided `ignoreSelector`
 */
export function serialize(range, root, ignoreSelector) {
  // BrowserRange
  if (range instanceof BrowserRange) {
    return serialize(normalize(range, root), root, ignoreSelector);
  }

  // NormalizedRange
  else if (range instanceof NormalizedRange) {
    // Convert this range into an object consisting of two pairs of (xpath,
    // character offset), which can be easily stored in a database.
    const serialization = function (node, isEnd) {
      let origParent;
      if (ignoreSelector) {
        origParent = $(node).parents(`:not(${ignoreSelector})`).eq(0);
      } else {
        origParent = $(node).parent();
      }
      const xpath = xpathFromNode(origParent, root)[0];
      const textNodes = getTextNodes(origParent);

      // Calculate real offset as the combined length of all the
      // preceding textNode siblings. We include the length of the
      // node if it's the end node.
      const nodes = textNodes.slice(0, textNodes.index(node));
      let offset = 0;
      nodes.each((index, n) => {
        offset += n.nodeValue.length;
      });

      if (isEnd) {
        return [xpath, offset + node.nodeValue.length];
      } else {
        return [xpath, offset];
      }
    };

    const start = serialization(range.start);
    const end = serialization(range.end, true);

    return new SerializedRange({
      // XPath strings
      start: start[0],
      end: end[0],
      // Character offsets (integer)
      startOffset: start[1],
      endOffset: end[1],
    });
  }

  // SerializedRange
  else if (range instanceof SerializedRange) {
    return serialize(normalize(range, root), root, ignoreSelector);
  } else {
    throw new Error('Could not serialize unknown range type');
  }
}
