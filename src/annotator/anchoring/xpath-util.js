/**
 * Finds the child node associated with the provided index and
 * type relative from a parent.
 */
export function findChild(parent, type, index) {
  if (!parent.hasChildNodes()) {
    throw new Error('XPath error: node has no children!');
  }
  const children = parent.childNodes;
  let found = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    let name = getNodeName(child);
    if (name === type) {
      found += 1;
      if (found === index) {
        return child;
      }
    }
  }
  throw new Error('XPath error: wanted child not found.');
}

/**
 * Get the node name for use in generating an xpath expression.
 *
 * @param {Node} node
 */
function getNodeName(node) {
  const nodeName = node.nodeName.toLowerCase();
  let result = nodeName;
  if (nodeName === '#text') {
    result = 'text()';
  }
  return result;
}

/**
 * Get the index of the node as it appears in its parent's child list
 *
 * @param {Node} node
 */
function getNodePosition(node) {
  let pos = 0;
  /** @type {Node|null} */
  let tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos += 1;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
}

function getPathSegment(node) {
  const name = getNodeName(node);
  const pos = getNodePosition(node);
  return `${name}[${pos}]`;
}

/**
 * A simple XPath generator using which can generate XPaths of the form
 * /tag[index]/tag[index].
 *
 * @param {Node} node - The node to generate a path to
 * @param {Node} root - Root node to which the returned path is relative
 */
export function xpathFromNode(node, root) {
  let xpath = '';

  /** @type {Node|null} */
  let elem = node;
  while (elem !== root) {
    if (!elem) {
      throw new Error('Node is not a descendant of root');
    }
    xpath = getPathSegment(elem) + '/' + xpath;
    elem = elem.parentNode;
  }
  xpath = '/' + xpath;
  xpath = xpath.replace(/\/$/, '');

  return xpath;
}

/**
 * Flatten a nested array structure.
 * TODO: use Array.prototype.flat and polyfill
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
      const nodes = [];
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
 * Determine the last text node inside or before the given node.
 */
export function getLastTextNodeUpTo(node) {
  switch (node.nodeType) {
    case Node.TEXT_NODE:
      return node; // We have found our text node.
    case Node.ELEMENT_NODE:
      // This is an element, we need to dig in
      if (node.lastChild) {
        // Does it have children at all?
        const result = getLastTextNodeUpTo(node.lastChild);
        if (result) {
          return result;
        }
      }
  }
  // Could not find a text node in current node, go backwards
  const prev = node.previousSibling;
  if (prev) {
    // eslint-disable-next-line no-unused-vars
    return getLastTextNodeUpTo(prev);
  } else {
    return null;
  }
}

/**
 * Determine the first text node in or after the given node.
 */
export function getFirstTextNodeNotBefore(node) {
  switch (node.nodeType) {
    case Node.TEXT_NODE:
      return node; // We have found our text node.
    case Node.ELEMENT_NODE:
      // This is an element, we need to dig in
      if (node.firstChild) {
        // Does it have children at all?
        const result = getFirstTextNodeNotBefore(node.firstChild);
        if (result) {
          return result;
        }
      }
  }
  // Could not find a text node in current node, go forward
  const next = node.nextSibling;
  if (next) {
    // eslint-disable-next-line no-unused-vars
    return getFirstTextNodeNotBefore(next);
  } else {
    return null;
  }
}
