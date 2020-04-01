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
  const textNodes = normedRange.textNodes();

  // Group text nodes into spans of adjacent nodes. If a group of text nodes are
  // adjacent, we only need to create one highlight element for the group.
  let textNodeSpans = [];
  let prevNode = null;
  let currentSpan = null;

  textNodes.forEach(node => {
    if (prevNode && prevNode.nextSibling === node) {
      currentSpan.push(node);
    } else {
      currentSpan = [node];
      textNodeSpans.push(currentSpan);
    }
    prevNode = node;
  });

  // Filter out text node spans that consist only of white space. This avoids
  // inserting highlight elements in places that can only contain a restricted
  // subset of nodes such as table rows and lists.
  textNodeSpans = textNodeSpans.filter(span =>
    // Check for at least one text node with non-space content.
    span.some(node => !white.test(node.nodeValue))
  );

  // Wrap each text node span with a `<hypothesis-highlight>` element.
  const highlights = [];
  textNodeSpans.forEach(nodes => {
    // A custom element name is used here rather than `<span>` to reduce the
    // likelihood of highlights being hidden by page styling.
    const highlightEl = document.createElement('hypothesis-highlight');
    highlightEl.className = cssClass;

    nodes[0].parentNode.replaceChild(highlightEl, nodes[0]);

    nodes.forEach(node => highlightEl.appendChild(node));
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
