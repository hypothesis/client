import { ListenerCollection } from '@hypothesis/frontend-shared';

import type { Destroyable } from '../../types/annotator';

/**
 * Events emitted by {@link DragHandler}.
 *
 * This is named `DragHandlerEvent` to avoid confusion with {@link DragEvent}.
 */
export type DragHandlerEvent = {
  type: 'dragstart' | 'dragend' | 'dragmove';

  /** Distance that the pointer has moved by since the start of the drag. */
  deltaX: number;
};

export type DragOptions = {
  /** Element where the pointer must be pressed to start the drag. */
  target: HTMLElement;

  /** Callback to invoke when drag events occur. */
  onDrag: (event: DragHandlerEvent) => void;

  /**
   * Threshold that pointer must move from where it is initially pressed before
   * a drag starts.
   */
  threshold?: number;
};

/**
 * Utility which recognizes drag/pan gestures on a control and reports events
 * when a drag is in progress.
 */
export class DragHandler implements Destroyable {
  private _listeners: ListenerCollection;

  /** Pointer position in the viewport at the start of the drag operation. */
  private _startX: number | null;

  private _dragActive: boolean;

  private _threshold: number;

  /**
   * Construct a drag handler which triggers drag events when the user presses
   * `target` and moves the pointer.
   */
  constructor({ target, threshold = 10, onDrag }: DragOptions) {
    // Disable the browser's own pan/scroll gestures on the target. Otherwise
    // the drag action will not work on mobile.
    target.style.touchAction = 'none';

    this._listeners = new ListenerCollection();

    this._startX = null;
    this._dragActive = false;
    this._threshold = threshold;

    this._listeners.add(target, 'pointerdown', event => {
      this._startX = event.clientX;
    });

    const onCancel = (event: PointerEvent) => {
      if (this._startX !== null && this._dragActive) {
        const deltaX = event.clientX - this._startX;
        onDrag({ type: 'dragend', deltaX });

        // If the user dragged a button or other clickable item, suppress the
        // "click" event that is delivered after releasing the mouse.
        suppressEvent(window, 'click');
      }
      this._startX = null;
      this._dragActive = false;
    };
    this._listeners.add(window, 'pointercancel', onCancel);
    this._listeners.add(window, 'pointerup', onCancel);

    this._listeners.add(window, 'pointermove', event => {
      if (this._startX === null) {
        return;
      }

      const deltaX = event.clientX - this._startX;
      if (!this._dragActive && Math.abs(deltaX) >= this._threshold) {
        this._dragActive = true;
        onDrag({ type: 'dragstart', deltaX });
      }

      if (this._dragActive) {
        onDrag({ type: 'dragmove', deltaX });
      }
    });
  }

  destroy() {
    this._listeners.removeAll();
  }
}

/** Suppress delivery of an event for a brief period of time. */
function suppressEvent(
  target: EventTarget,
  type: string,
  duration: number = 0,
) {
  const ctrl = new AbortController();
  target.addEventListener('click', e => e.stopPropagation(), {
    capture: true,
    signal: ctrl.signal,
  });
  setTimeout(() => {
    ctrl.abort();
  }, duration);
}
