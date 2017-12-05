'use strict';

const debounce = require('lodash.debounce');
const OverlayHighlight = require('./overlay-highlight');
const EventHandler = require('./overlay-events');

const DEBOUNCE_WAIT = 50;

class OverlayHighlighter {
  constructor() {
    this._highlights = [];
    this._highlightsChangedListeners = [];

    this._notifyHighlightsChange = (highlights) => {
      this._highlightsChangedListeners.forEach((cb)=>{
        cb(highlights);
      });
    };

    this._redrawHighlights = () => {
      this._highlights.forEach( ( highlight ) => {
        highlight.render();
        this._notifyHighlightsChange(highlight.getHighlightReferences());
      });
    };

    this._resizeListener = null;
    this._eventHandler = null;
  }

  highlightRange(normedRange, annotation) {

    if(!this._resizeListener){
      this._resizeListener = window.addEventListener('resize', debounce(this._redrawHighlights, DEBOUNCE_WAIT), /*useCapture*/false);
    }

    const highlight = new OverlayHighlight(normedRange, annotation);

    highlight.render();

    // save highlight reference so we can redraw on viewport changes
    this._highlights.push(highlight);

    return highlight.getHighlightReferences();
  }

  onHighlightsChanged(cb) {
    this._highlightsChangedListeners.push(cb);
  }

  dispose() {
    if (this._eventHandler) {
      this._eventHandler.dispose();
    }
    this._highlights.forEach(hl => hl.remove());
  }

  /**
   * Given the events we care about, attach proper listeners and
   *  invoke the provided event handler callback.
   *  Note: we are only going to bind listeners once our overlays have been
   *    added to the DOM.
   *
   * @param Object eventHandlers is a key value pair object where the key represents
   *  the event we are binding to (like 'click' or 'mouseover') and the value is
   *  the callback function to be invoked when the respective event occurs
   * @param Element scopeTo defines where our event delegation should be scoped to
   */
  registerEventHandlers(events, scopedTo) {
    if (!this._eventHandler) {
      this._eventHandler = new EventHandler(events, scopedTo, this._highlights);
    }
  }
}

module.exports = OverlayHighlighter;
