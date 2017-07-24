'use strict';

const debounce = require('lodash.debounce');
const OverlayHighlight = require('./overlay-highlight');
const overlayEvents = require('./overlay-events');

const DEBOUNCE_WAIT = 50;
const _highlights = [];
const _highlightsChangedListeners = [];
let _boundOverlayEventBubbling = false;

const _notifyHighlightsChange = (highlights) => {
  _highlightsChangedListeners.forEach((cb)=>{
    cb(highlights);
  });
};

const _redrawHighlights = () => {
  _highlights.forEach( ( highlight ) => {
    highlight.render();
    _notifyHighlightsChange(highlight.getHighlightReferences());
  });
};


let _resizeListener;

module.exports = {

  highlightRange: (normedRange) => {

    if(!_resizeListener){
      _resizeListener = window.addEventListener('resize', debounce(_redrawHighlights, DEBOUNCE_WAIT), /*useCapture*/false);
    }

    const highlight = new OverlayHighlight(normedRange);

    highlight.render();

    // save highlight reference so we can redraw on viewport changes
    _highlights.push(highlight);

    return highlight.getHighlightReferences();
  },

  onHighlightsChanged: (cb) => {
    _highlightsChangedListeners.push(cb);
  },

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
  registerEventHandlers: (events, scopedTo) => {
    if(!_boundOverlayEventBubbling){
      _boundOverlayEventBubbling = true;
      overlayEvents.bindEvents(events, scopedTo, _highlights);
    }
  },
};
