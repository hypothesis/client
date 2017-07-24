'use strict';

const overlayUtils = require('./overlay-utils');

class OverlayHighlight {

  constructor(normedRange, target = document.body){
    this.normedRange = normedRange;
    this.range = normedRange.toRange();
    this.target = target;

    const highlightContainer = overlayUtils.createSVGElement('svg');
    const highlightEl = overlayUtils.createSVGElement('g');

    this.container = highlightContainer;
    this.container.style.position = 'absolute';

    // Disable pointer events
    this.container.setAttribute('pointer-events', 'none');
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

    const rects = this.range.getClientRects();

    // The clientRects provided for a range can include large boundary boxes
    // that are an artifact of a selection made over a large section of the page.
    // These large boundaries are effectively a wrapper of the contained text selections.
    // That is, if we displayed these rects it would include all of the text selections
    // and a single large highlight that wraps the whole area. We are going to apply
    // a simple heuristic that seems to work well at filtering out these boundary boxes.
    // We will calculate the average height of the client rects and make sure that
    // all displayed rects are less than a generous multiple of that.
    // We can optimize this in the future as we learn more about these heuristics.
    const clientRectsHeights = Array.from(rects).reduce((sum, clientRect)=>{
      return sum + clientRect.height;
    }, 0);

    const avgHeight = clientRectsHeights / rects.length;

    this.filteredRangeRects = Array.from(rects).filter((rect)=>{
      return rect.height < (avgHeight * 3);
    });

    const offset = this.element.getBoundingClientRect();

    this.highlightElementRefs = this.filteredRangeRects.map((rect) => {
      const el = overlayUtils.createSVGElement('rect');
      el.setAttribute('x', rect.left - offset.left);
      el.setAttribute('y', rect.top - offset.top);
      el.setAttribute('height', rect.height);
      el.setAttribute('width', rect.width);
      el.classList.add('annotator-hl');

      this.element.appendChild(el);
      return el;
    });
  }

  reposition() {

    // update the container position
    overlayUtils.setCoords(this.container, overlayUtils.getCoords(this.target));

    const offset = this.element.getBoundingClientRect();

    this.highlightElementRefs.forEach((el, index) => {
      const rect = this.filteredRangeRects[index];
      el.setAttribute('x', rect.left - offset.left);
      el.setAttribute('y', rect.top - offset.top);
      el.setAttribute('height', rect.height);
      el.setAttribute('width', rect.width);
    });
  }

  getHighlightReferences() {
    return this.highlightElementRefs;
  }
}

module.exports = OverlayHighlight;
