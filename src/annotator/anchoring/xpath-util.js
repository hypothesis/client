import $ from 'jquery';

/**
 * Get the node name for use in generating an xpath expression.
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
 */
function getNodePosition(node) {
  let pos = 0;
  let tmp = node;
  while (tmp) {
    if (tmp.nodeName === node.nodeName) {
      pos += 1;
    }
    tmp = tmp.previousSibling;
  }
  return pos;
}

/**
 * A simple XPath evaluator using jQuery which can evaluate queries of
 *
 * @deprecated
 */
export function simpleXPathJQuery(nodes, relativeRoot) {
  const paths = nodes.map((index, node) => {
    let path = '';
    let elem = node;
    while (elem.nodeType === Node.ELEMENT_NODE && elem !== relativeRoot) {
      let tagName = elem.tagName.replace(':', '\\:');
      let idx = $(elem.parentNode).children(tagName).index(elem) + 1;
      path = '/' + elem.tagName.toLowerCase() + `[${idx}]` + path;
      elem = elem.parentNode;
    }
    return path;
  });
  return paths.get();
}

function getPathSegment(node) {
  const name = getNodeName(node);
  const pos = getNodePosition(node);
  return `${name}[${pos}]`;
}

/**
 * A simple XPath evaluator using only standard DOM methods which can
 * evaluate queries of the form /tag[index]/tag[index].
 */
export function simpleXPathPure(nodes, relativeRoot) {
  let rootNode = relativeRoot;

  function getPathTo(node) {
    let xpath = '';
    let elem = node;
    while (elem !== rootNode) {
      if (!elem) {
        throw new Error(
          'Called getPathTo on a node which was not a descendant of @rootNode. ' +
            rootNode
        );
      }
      xpath = getPathSegment(elem) + '/' + xpath;
      elem = elem.parentNode;
    }
    xpath = '/' + xpath;
    xpath = xpath.replace(/\/$/, '');
    return xpath;
  }
  const paths = nodes.map((index, node) => getPathTo(node));
  return paths.get();
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
