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
 * A simple XPath generator which can generate XPaths of the form
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
  xpath = xpath.replace(/\/$/, ''); // Remove trailing slash

  return xpath;
}
