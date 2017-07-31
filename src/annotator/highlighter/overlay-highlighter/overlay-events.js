'use strict';

const throttle = require('lodash.throttle');
const overlayUtils = require('./overlay-utils');

class EventHandler {
  constructor(eventHandlers, scopeTo, highlightReferences) {
    this._boundEventHandlers = eventHandlers;
    this._listeners = [];
    this._root = scopeTo;

    const immediateEvents = ['click', 'touchstart'].filter((eventName)=>{
      return eventName in eventHandlers;
    });

    immediateEvents.forEach((ev)=>{
      this._addListener(ev, e => {
        this._relayEventToHighlight(e, highlightReferences);
      });
    });

    // In order to mimic mouse hover status events, we have to track
    // where the mouse is on the page then reconcile the appropriate events.
    let hoveringSet = [];

    const mouseMoveListener = throttle((e)=>{

      // identify all highlights being hovered currently
      const currentlyHovering = highlightReferences.reduce((hoveringArray, {element})=>{
        const hoveringElement = overlayUtils.highlightAtPoint(element, e.clientX, e.clientY);
        if(hoveringElement){
          hoveringArray.push(hoveringElement);
        }
        return hoveringArray;
      }, []);

      // calculate which highlights are no longer being hovered and trigger event
      hoveringSet.forEach((highlight)=>{
        if(!currentlyHovering.includes(highlight)){
          this._invokeEvent({ type: 'mouseout'}, highlight);
        }
      });

      // calculate which highlights are newly being hovered and trigger event
      hoveringSet = currentlyHovering.map((highlight) => {
        if(!hoveringSet.includes(highlight)){
          this._invokeEvent({ type: 'mouseover'}, highlight);
        }
        return highlight;
      });
    }, 150);

    this._addListener('mousemove', mouseMoveListener, true /* capture */);
  }

  /**
   * Remove all registered event listeners.
   */
  dispose() {
    this._listeners.forEach(listener => {
      this._root.removeEventListener(listener.type, listener.callback);
    });
  }

  _addListener(type, callback, capture) {
    this._root.addEventListener(type, callback, capture);
    this._listeners.push({ type, callback });
  }

  _invokeEvent(eventData = {}, highlightElement, target) {
    if (eventData.type in this._boundEventHandlers) {
      this._boundEventHandlers[eventData.type](Object.assign(eventData, {
        currentTarget: highlightElement,
        target: target || highlightElement,
      }));
    }
  }

  _relayEventToHighlight(e, highlightReferences) {
    // We walk through the set of highlightReferences elements in reverse order so that
    // events are sent to those most recently added first.
    //
    // This is the least surprising behaviour as it simulates the way the
    // browser would work if items added later were drawn "on top of"
    // earlier ones.
    const matchedHighlights = highlightReferences.reduce((matches, {element})=>{
      const match = overlayUtils.highlightAtPoint(element, e.clientX, e.clientY);
      if(match){
        matches.push(match);
      }
      return matches;
    }, []);

    let eventData = {};
    // send event to the highlights in the correct area
    matchedHighlights.forEach((highlightElement, index, arrayRef)=>{
      eventData = Object.assign(eventData, {
        type: e.type,
        currentTarget: highlightElement,
        target: arrayRef.slice(-1)[0],
      });
      this._invokeEvent(eventData, highlightElement, arrayRef.slice(-1)[0]);
    });
  }
}

module.exports = EventHandler;
