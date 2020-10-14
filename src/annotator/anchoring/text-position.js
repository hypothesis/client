/**
 * Functions to convert between DOM ranges and characters offsets within the
 * `textContent` of HTML elements.
 *
 * These were added to work around issues in `dom-anchor-text-position`'s
 * `toRange` implementation. When the issue is resolved upstream, we may still
 * want to keep the test suite for this module.
 *
 * See https://github.com/hypothesis/client/issues/1329
 */

/**
 * Convert `start` and `end` character offset positions within the `textContent`
 * of a `root` element into a `Range`.
 *
 * Throws if the `start` or `end` offsets are outside of the range `[0,
 * root.textContent.length]`.
 *
 * @param {HTMLElement} root
 * @param {number} start - Character offset within `root.textContent`
 * @param {number} end - Character offset within `root.textContent`
 * @return {Range} Range spanning text from `start` to `end`
 */
export function toRange(root, start, end) {
  // The `filter` and `expandEntityReferences` arguments are mandatory in IE
  // although optional according to the spec.
  const nodeIter = root.ownerDocument.createNodeIterator(
    root,
    NodeFilter.SHOW_TEXT
  );

  let startContainer;
  let startOffset = 0;
  let endContainer;
  let endOffset = 0;

  let textLength = 0;

  let node;
  while ((node = nodeIter.nextNode()) && (!startContainer || !endContainer)) {
    const nodeText = /** @type {string} */ (node.nodeValue);

    if (
      !startContainer &&
      start >= textLength &&
      start <= textLength + nodeText.length
    ) {
      startContainer = node;
      startOffset = start - textLength;
    }

    if (
      !endContainer &&
      end >= textLength &&
      end <= textLength + nodeText.length
    ) {
      endContainer = node;
      endOffset = end - textLength;
    }

    textLength += nodeText.length;
  }

  if (!startContainer) {
    throw new Error('invalid start offset');
  }
  if (!endContainer) {
    throw new Error('invalid end offset');
  }

  const range = root.ownerDocument.createRange();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);

  return range;
}
