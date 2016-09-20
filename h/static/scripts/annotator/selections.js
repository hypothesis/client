'use strict';

var observable = require('../util/observable');

/* Returns the active DOM element that was selected, filtering out unactionable selections. */
function selectedElement(document) {

  var selection = document.getSelection();
  var nodeName = document.activeElement.nodeName;

  if (nodeName == "BODY") {
      if (!selection.rangeCount || selection.getRangeAt(0).collapsed) {
        return null;
      } else {
        return document.activeElement;
      }
  } else if (nodeName == "INPUT") {
      return document.activeElement;
  }

  return null;
}

/**
 * Returns an Observable stream of text selections in the current document.
 *
 * New values are emitted when the user finishes making a selection
 * (represented by a `DOMRange`) or clears a selection (represented by `null`).
 *
 * A value will be emitted with the selected range at the time of subscription
 * on the next tick.
 *
 * @return Observable<DOMRange|null>
 */
function selections(document) {
  // Get a stream of selection changes that occur whilst the user is not
  // making a selection with the mouse.
  var isMouseDown;
  var selectionEvents = observable.listen(document,
    ['mousedown', 'mouseup', 'selectionchange'])
    .filter(function (event) {
      if (event.type === 'mousedown' || event.type === 'mouseup') {
        isMouseDown = event.type === 'mousedown';
        return false;
      } else {
        return !isMouseDown;
      }
    });

  var events = observable.merge([
    // Add a delay before checking the state of the selection because
    // the selection is not updated immediately after a 'mouseup' event
    // but only on the next tick of the event loop.
    observable.buffer(10, observable.listen(document, ['mouseup'])),

    // Buffer selection changes to avoid continually emitting events whilst the
    // user drags the selection handles on mobile devices
    observable.buffer(100, selectionEvents),

    // Emit an initial event on the next tick
    observable.delay(0, observable.Observable.of({})),
  ]);

  return events.map(function () {
    return selectedElement(document);
  });
}

module.exports = selections;
