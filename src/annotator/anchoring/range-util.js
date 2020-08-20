/**
 * Flatten a nested array structure
 *
 * TODO: Replace with Array.prototype.flat and polyfill
 */
function flatten(array) {
  const flatten = ary => {
    let flat = [];
    ary.forEach(el => {
      if (el && Array.isArray(el)) {
        flat = flat.concat(flatten(el));
      } else {
        flat = flat.concat(el);
      }
    });
    return flat;
  };
  return flatten(array);
}

/**
 * Finds all text nodes within the elements in the current collection.
 * Returns a new jQuery collection of text nodes.
 */
export function getTextNodes(jq) {
  const getTextNodes = node => {
    if (node && node.nodeType !== Node.TEXT_NODE) {
      let nodes = [];
      if (node.nodeType !== Node.COMMENT_NODE) {
        [...node.childNodes].forEach(child => {
          nodes.push(getTextNodes(child));
        });
      }
      return nodes;
    } else {
      return node;
    }
  };
  return jq.map((index, node) => {
    return flatten(getTextNodes(node));
  });
}

/**
 * Determine the last text node inside or before the given node
 */
export function getLastTextNodeUpTo(n) {
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n; // We have found our text node.
    case Node.ELEMENT_NODE:
      // This is an element, we need to dig in
      if (n.lastChild) {
        // Does it have children at all?
        const result = getLastTextNodeUpTo(n.lastChild);
        if (result) {
          return result;
        }
      }
  }
  // Could not find a text node in current node, go backwards
  const prev = n.previousSibling;
  if (prev) {
    return getLastTextNodeUpTo(prev);
  } else {
    return null;
  }
}

/**
 * Determine the first text node in or after the given jQuery node.
 */
export function getFirstTextNodeNotBefore(n) {
  switch (n.nodeType) {
    case Node.TEXT_NODE:
      return n; // We have found our text node.
    case Node.ELEMENT_NODE:
      // This is an element, we need to dig in
      if (n.firstChild) {
        // Does it have children at all?
        const result = getFirstTextNodeNotBefore(n.firstChild);
        if (result) {
          return result;
        }
      }
  }
  // Could not find a text node in current node, go forward
  const next = n.nextSibling;
  if (next) {
    return getFirstTextNodeNotBefore(next);
  } else {
    return null;
  }
}
