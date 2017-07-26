'use strict';

const $ = require('jquery');
const overlayUtils = require('./overlay-utils');
const rangeUtils = require('../../../annotator/range-util');

class OverlayHighlight {

  constructor(normedRange, annotation = null, target = document.body){
    this.normedRange = normedRange;
    this.range = normedRange.toRange();
    this.annotation = annotation;
    this.target = target;

    const highlightContainer = overlayUtils.createSVGElement('svg');
    const highlightEl = overlayUtils.createSVGElement('g');

    this.container = highlightContainer;
    this.container.style.position = 'absolute';

    // Disable pointer events so that click events and such
    // will target the content below this highlight overlay.
    // Note: we use event delegation/inspection to apply
    // events to the highlight elements themselves
    this.container.setAttribute('pointer-events', 'none');

    // allow the highlight background to be amplified through this
    // overlay background color
    // https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode
    this.container.style.mixBlendMode = 'multiply';

    this.element = highlightEl;

    highlightContainer.appendChild(highlightEl);

    target.appendChild(this.container);
  }

  render() {

    // update the container position
    overlayUtils.setCoords(this.container, overlayUtils.getCoords(this.target));

    // Empty element
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
    
    const offset = this.element.getBoundingClientRect();

    this.filteredRangeRects = rangeUtils.getTextBoundingBoxes(this.range);

    this.highlightElementRefs = this.filteredRangeRects.map((rect) => {
      const el = overlayUtils.createSVGElement('rect');
      el.setAttribute('x', rect.left - offset.left);
      el.setAttribute('y', rect.top - offset.top);
      el.setAttribute('height', rect.height);
      el.setAttribute('width', rect.width);
      el.classList.add('annotator-hl');

      this.element.appendChild(el);

      // Bind the annotation data to the highlight elements so the elements
      // themselves can be used to directly look up the annotation being referenced
      if(this.annotation){
        $(el).data('annotation', this.annotation);
      }

      return el;
    });
  }

  getHighlightReferences() {
    return this.highlightElementRefs;
  }
}

module.exports = OverlayHighlight;
