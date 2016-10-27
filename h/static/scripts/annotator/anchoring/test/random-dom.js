'use strict';

/**
 * @typedef {() => number} PRNG - Function which generates a random number in [0, 1)
 */

/**
 * Test helpers for generating randomized DOM trees and ranges for use
 * in fuzz testing.
 */

var opcodes = {
  /** Append an element of a randomly selected type to the current element. */
  APPEND_CHILD: 0,
  /** Append a text node with randomly selected content to the current element. */
  APPEND_TEXT: 1,
  /** Set the current element to the current element's parent node. */
  GO_UP: 2,
  /** Set the current element to a randomly selected child of the current node. */
  GO_DOWN: 3,
};

var elementTypes = [
  'div',
  'h3',
  'label',
  'p',
  'section',
  'span',
];

// Contents for text nodes. Each string has a start ('^') and end ('$') marker
// so that the bounds of individual text nodes can be seen when the DOM tree is
// serialized using Element#innerHTML
var phrases = [
  '',
  '-',
  '^aa$',
  '^bbb$',
  '^c$',
  '^ddddd$',
];

/**
 * Return a random value in [min, max]
 *
 * @param {number} min
 * @param {number} max
 * @param {PRNG} genRandom
 * @return {number}
 */
function randomInRange(min, max, genRandom) {
  if (min > max) {
    throw new Error('Bounds error: min > max');
  }
  return min + Math.round(genRandom() * (max - min));
}

/**
 * Return a randomly selected element from an array.
 *
 * @param {T[]} array
 * @param {PRNG} genRandom
 * @return {T}
 */
function randomElement(array, genRandom) {
  return array[randomInRange(0, array.length-1, genRandom)];
}

/**
 * Generate a randomized DOM tree.
 *
 * @param {PRNG} genRandom
 * @return {Element} The container element of the randomly generated DOM tree.
 */
function generateRandomDOM(genRandom) {
  var seqLength = randomInRange(3, 100, genRandom);
  var root = document.createElement('div');
  var current = root;

  var opcodeList = Object.values(opcodes);

  for (var i=0; i < seqLength; i++) {
    var op = randomElement(opcodeList, genRandom);
    switch (op) {
    case opcodes.APPEND_CHILD:
      {
        var tagName = randomElement(elementTypes, genRandom);
        var element = document.createElement(tagName);
        current.appendChild(element);
      }
      break;
    case opcodes.APPEND_TEXT:
      {
        var content = randomElement(phrases, genRandom);
        current.appendChild(document.createTextNode(content));
      }
      break;
    case opcodes.GO_UP:
      if (current !== root) {
        current = current.parentNode;
      }
      break;
    case opcodes.GO_DOWN:
      {
        var children = Array.from(current.childNodes).filter(function (n) {
          return n.nodeType === Node.ELEMENT_NODE;
        });
        if (children.length > 0) {
          current = randomElement(children, genRandom);
        }
      }
      break;
    }
  }

  return root;
}

/**
 * Return the maximum offset for the start/end point of a Range where the
 * `startContainer` or `endContainer` is `node`.
 *
 * @param {Node} node
 */
function maxOffset(node) {
  switch (node.nodeType) {
  case Node.TEXT_NODE:
    return node.nodeValue.length;
  case Node.ELEMENT_NODE:
    return node.childNodes.length;
  default:
    return 0;
  }
}

/**
 * Generate a Range between random start and end points within a `root`
 * container Node.
 *
 * @param {Node} root - Root DOM node to generate a `Range` within
 * @param {PRNG} genRandom
 * @return {Range} A valid DOM Range instance
 */
function randomRange(root, genRandom) {
  var nodeIter = root.ownerDocument.createNodeIterator(root,
    NodeFilter.SHOW_ALL, null /* filter */, false /* expandEntityReferences */);

  var currentNode;
  var nodes = [];
  while (currentNode = nodeIter.nextNode()) { // eslint-disable-line no-cond-assign
    nodes.push(currentNode);
  }

  var startIdx = randomInRange(0, nodes.length-1, genRandom);
  var endIdx = randomInRange(startIdx, nodes.length-1, genRandom);

  var startContainer = nodes[startIdx];
  var endContainer = nodes[endIdx];

  var startOffset = randomInRange(0, maxOffset(startContainer), genRandom);
  var endOffset;

  if (startContainer === endContainer) {
    endOffset = randomInRange(startOffset, maxOffset(endContainer), genRandom);
  } else {
    endOffset = randomInRange(0, maxOffset(endContainer), genRandom);
  }

  var range = root.ownerDocument.createRange();
  range.setStart(startContainer, startOffset);
  range.setEnd(endContainer, endOffset);

  return range;
}

module.exports = {
  generateRandomDOM: generateRandomDOM,
  randomRange: randomRange,
};
