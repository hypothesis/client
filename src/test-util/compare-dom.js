/**
 * Utilities for comparing DOM nodes and trees etc. in tests or producing
 * representations of them.
 */

/**
 * Elide `text` if it exceeds `length`.
 *
 * @param {string} text
 * @param {number} length
 */
function elide(text, length) {
  return text.length < length ? text : text.slice(0, length) + '...';
}

/**
 * Return a string representation of a node for use in asserts and debugging.
 *
 * @param {Node} node
 */
export function nodeToString(node) {
  switch (node.nodeType) {
    case Node.TEXT_NODE:
      return `[Text: ${elide(node.data, 100)}]`;
    case Node.ELEMENT_NODE:
      return `[${node.localName} element: ${elide(node.innerHTML, 400)}]`;
    case Node.DOCUMENT_NODE:
      return '[Document]';
    case Node.CDATA_SECTION_NODE:
      return '[CData Node]';
    default:
      return '[Other node]';
  }
}

/**
 * Compare two nodes and throw if not equal.
 *
 * This produces more readable output than using `assert.equal(actual, expected)`
 * if there is a mismatch.
 */
export function assertNodesEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${nodeToString(actual)} to equal ${nodeToString(expected)}`,
    );
  }
}

/**
 * Return all the `Text` descendants of `node`
 *
 * @param {Node} node
 * @return {Text[]}
 */
export function textNodes(node) {
  const nodes = [];
  const iter = document.createNodeIterator(node, NodeFilter.SHOW_TEXT);
  let current;
  while ((current = iter.nextNode())) {
    nodes.push(current);
  }
  return nodes;
}
