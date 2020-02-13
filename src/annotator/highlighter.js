/**
 * Wraps the DOM Nodes within the provided range with a highlight
 * element of the specified class and returns the highlight Elements.
 *
 * @param {NormalizedRange} normedRange - Range to be highlighted.
 * @param {string} cssClass - A CSS class to use for the highlight
 * @return {HTMLElement[]} - Elements wrapping text in `normedRange` to add a highlight effect
 */
export function highlightRange(normedRange, cssClass = 'hypothesis-highlight') {
  const white = /^\s*$/;

  // Find text nodes within the range to highlight.
  //
  // We ignore text nodes that contain only whitespace to avoid inserting
  // elements in places that can only contain a restricted subset of nodes such
  // as table rows and lists. This does mean that there may be the odd abandoned
  // whitespace node in a paragraph that is skipped but better than breaking
  // table layouts.
  const textNodes = normedRange
    .textNodes()
    .filter(node => !white.test(node.nodeValue));

  // Wrap each text node with a `<hypothesis-highlight>` element.
  const highlights = [];
  textNodes.forEach(node => {
    // A custom element name is used here rather than `<span>` to reduce the
    // likelihood of highlights being hidden by page styling.
    const highlightEl = document.createElement('hypothesis-highlight');
    highlightEl.className = cssClass;

    node.parentNode.replaceChild(highlightEl, node);
    highlightEl.appendChild(node);
    highlights.push(highlightEl);
  });

  return highlights;
}

/**
 * Replace a child `node` with `replacements`.
 *
 * nb. This is like `ChildNode.replaceWith` but it works in IE 11.
 *
 * @param {Node} node
 * @param {Node[]} replacements
 */
function replaceWith(node, replacements) {
  const parent = node.parentNode;
  replacements.forEach(r => parent.insertBefore(r, node));
  node.remove();
}

/**
 * Remove highlights from a range previously highlighted with `highlightRange`.
 *
 * @param {HTMLElement[]} highlights - The highlight elements returned by `highlightRange`
 */
export function removeHighlights(highlights) {
  for (let h of highlights) {
    if (h.parentNode) {
      const children = Array.from(h.childNodes);
      replaceWith(h, children);
    }
  }
}

/**
 * @typedef Rect
 * @prop {number} top
 * @prop {number} left
 * @prop {number} bottom
 * @prop {number} right
 */

/**
 * Get the bounding client rectangle of a collection in viewport coordinates.
 * Unfortunately, Chrome has issues ([1]) with Range.getBoundingClient rect or we
 * could just use that.
 *
 * [1] https://bugs.chromium.org/p/chromium/issues/detail?id=324437
 *
 * @param {HTMLElement[]} collection
 * @return {Rect}
 */
export function getBoundingClientRect(collection) {
  // Reduce the client rectangles of the highlights to a bounding box
  const rects = collection.map(n => n.getBoundingClientRect());
  return rects.reduce((acc, r) => ({
    top: Math.min(acc.top, r.top),
    left: Math.min(acc.left, r.left),
    bottom: Math.max(acc.bottom, r.bottom),
    right: Math.max(acc.right, r.right),
  }));
}
