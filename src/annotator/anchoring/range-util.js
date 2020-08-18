import $ from 'jquery';

/**
 * A simple XPath evaluator using jQuery which can evaluate queries of
 */
function simpleXPathJQuery(nodes, relativeRoot) {
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

function findChild(node, type, index) {
  if (node.hasChildNodes()) {
    throw new Error('XPath error: node has no children!');
  }
  const children = node.childNodes;
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
 */
function getNodeName(node) {
  const nodeName = node.nodeName.toLowerCase();
  let result = nodeName;
  if (nodeName === '#text') {
    result = 'text()';
  }
  if (nodeName === '#comment') {
    result = 'comment()';
  }
  if (nodeName === '#cdata-section') {
    result = 'cdata-section()';
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
 * A simple XPath evaluator using only standard DOM methods which can
 * evaluate queries of the form /tag[index]/tag[index].
 */
function simpleXPathPure(nodes, relativeRoot) {
  function getPathSegment(node) {
    const name = getNodeName(node);
    const pos = getNodePosition(node);
    return `${name}[${pos}]`;
  }

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
  const paths = nodes.map((index, node) => {
    return getPathTo(node);
  });
  return paths.get();
}

/**
 * Public: Flatten a nested array structure
 */
function flatten(array) {
  const flatten = ary => {
    let flat = [];
    ary.forEach(el => {
      if (el && $.isArray(el)) {
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
 * Public: Finds all text nodes within the elements in the current collection.
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
 * Public: determine the last text node inside or before the given node
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
    // eslint-disable-next-line no-unused-vars
    return getLastTextNodeUpTo(prev);
  } else {
    return null;
  }
}

/**
 * Public: determine the first text node in or after the given jQuery node.
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
    // eslint-disable-next-line no-unused-vars
    return getFirstTextNodeNotBefore(next);
  } else {
    return null;
  }
}

export function xpathFromNode(el, relativeRoot) {
  let result;
  try {
    result = simpleXPathJQuery(el, relativeRoot);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(
      'jQuery-based XPath construction failed! Falling back to manual.'
    );
    result = simpleXPathPure(el, relativeRoot);
  }
  return result;
}

export function nodeFromXPath(xp, root) {
  const steps = xp.substring(1).split('/');
  let node = root;
  steps.forEach(step => {
    let [name, idx] = step.split('[');
    idx = idx ? parseInt(idx.split(']'))[0] : 1;
    node = findChild(node, name.toLowerCase(), idx);
  });
  return node;
}
