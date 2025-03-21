import { ListenerCollection } from '@hypothesis/frontend-shared';

import { selectedRange } from './range-util';

/**
 * An observer that watches for and buffers changes to the document's current selection.
 */
export class SelectionObserver {
  /** Tracks the timeout ID of the last scheduled callback */
  private _pendingCallback: number | null;
  private _document: Document;
  private _listeners: ListenerCollection;

  /**
   * Start observing changes to the current selection in the document.
   *
   * @param callback - Callback invoked with the selected region of the document
   *                   when it has changed.
   * @param document_ - Test seam
   */
  constructor(
    callback: (range: Range | null) => void,
    document_: Document = document,
  ) {
    let isMouseDown = false;

    this._pendingCallback = null;

    const scheduleCallback = (delay = 10) => {
      this._pendingCallback = setTimeout(() => {
        callback(selectedRange(document_.getSelection()));
      }, delay);
    };

    const eventHandler = (event: Event) => {
      if (event.type === 'mousedown') {
        isMouseDown = true;
      }
      if (event.type === 'mouseup') {
        isMouseDown = false;
      }

      // If the user makes a selection with the mouse, wait until they release
      // it before reporting a selection change.
      if (isMouseDown) {
        return;
      }

      this._cancelPendingCallback();

      // Schedule a notification after a short delay. The delay serves two
      // purposes:
      //
      // - If this handler was called as a result of a 'mouseup' event then the
      //   selection will not be updated until the next tick of the event loop.
      //   In this case we only need a short delay.
      //
      // - If the user is changing the selection with a non-mouse input (eg.
      //   keyboard or selection handles on mobile) this buffers updates and
      //   makes sure that we only report one when the update has stopped
      //   changing. In this case we want a longer delay.

      const delay = event.type === 'mouseup' ? 10 : 100;
      scheduleCallback(delay);
    };

    this._document = document_;
    this._listeners = new ListenerCollection();

    this._listeners.add(document_, 'selectionchange', eventHandler);

    // Mouse events are handled on the body because propagation may be stopped
    // before they reach the document in some environments (eg. VitalSource).
    this._listeners.add(document_.body, 'mousedown', eventHandler);
    this._listeners.add(document_.body, 'mouseup', eventHandler);

    // Report the initial selection.
    scheduleCallback(1);
  }

  disconnect() {
    this._listeners.removeAll();
    this._cancelPendingCallback();
  }

  private _cancelPendingCallback() {
    if (this._pendingCallback) {
      clearTimeout(this._pendingCallback);
      this._pendingCallback = null;
    }
  }
}
