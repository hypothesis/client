'use strict';

module.exports = {

  createSVGElement: (name) => {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  },

  getCoords: (el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft,
      height: rect.height,
      width: rect.width,
    };
  },

  setCoords: (el, coords) => {
    el.style.top = `${coords.top}px`;
    el.style.left = `${coords.left}px`;
    el.style.height = `${coords.height}px`;
    el.style.width = `${coords.width}px`;
  },

  /**
  * Check if the item contains the point denoted by the passed coordinates
  * @param item {Element} An object with getBoundingClientRect and getClientRects
  *                      methods.
  * @param x {Number}
  * @param y {Number}
  * @return {Element} The highlight element at the point provided, if one exists.
  */
  highlightAtPoint: (highlightEl, x, y) => {

    function rectContains(r, x, y) {
      return (r.top <= y && r.left <= x && r.bottom > y && r.right > x);
    }

    // Check overall bounding box first
    if (!rectContains(highlightEl.getBoundingClientRect(), x, y)) {
      return null;
    }

    // Then continue to check each child rect
    const children = Array.from(highlightEl.childNodes);

    return children.find((child)=>{
      return rectContains(child.getBoundingClientRect(), x, y);
    });
  },
};
