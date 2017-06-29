'use strict';

module.exports = {
  createSVGElement: function(name){
    return document.createElementNS('http://www.w3.org/2000/svg', name);
  },

  getCoords: function (el) {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft,
      height: rect.height,
      width: rect.width,
    };
  },

  setCoords: function (el, coords) {
    el.style.top = `${coords.top}px`;
    el.style.left = `${coords.left}px`;
    el.style.height = `${coords.height}px`;
    el.style.width = `${coords.width}px`;
  },
};
