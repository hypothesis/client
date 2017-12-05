'use strict';

function rectContainsPoint(rect, x, y) {
  return x >= rect.left &&
         y >= rect.top &&
         x <= rect.right &&
         y <= rect.bottom;
}

/**
 * Return the child elements of `root` at a given point.
 *
 * @param {Element} root
 * @param {number} x
 * @param {number} y
 * @return {Element[]}
 */
function elementsFromPoint(root, x, y) {
  var nodes = [];

  const addNode = node => {
    nodes.push(node);
    for (let i=0; i < node.childNodes.length; i++) {
      addNode(node.childNodes[i]);
    }
  };
  addNode(root);

  return nodes.filter(node => {
    if (!node.getBoundingClientRect) {
      return false;
    }
    var boundingRect = node.getBoundingClientRect();
    if (boundingRect.width < 1) {
      return false;
    }
    return rectContainsPoint(boundingRect, x, y);
  });
}

module.exports = elementsFromPoint;
