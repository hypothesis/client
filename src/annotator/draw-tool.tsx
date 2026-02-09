import { render } from 'preact';

import { promiseWithResolvers } from '../shared/promise-with-resolvers';
import type {
  Destroyable,
  KeyboardMode,
  PinnedCorner,
  Point,
  Rect,
  Shape,
} from '../types/annotator';
import { RESIZE_CORNERS_ORDER } from '../types/annotator';
import DrawToolAnnouncer from './components/DrawToolAnnouncer';
import DrawToolKeyboardIndicator from './components/DrawToolKeyboardIndicator';
import { DrawToolSurface } from './components/DrawToolSurface';
import {
  clampRectToViewport,
  computeInitialShapePosition,
  getViewportBounds,
} from './util/draw-tool-position';
import { isEditableContext } from './util/node';
import {
  applyMoveArrowKeyToPoint,
  applyMoveArrowKeyToRect,
} from './util/rect-move';
import {
  applyResizeArrowKey,
  canModifyFromPinnedCorner,
} from './util/rect-resize';

/** Normalize a rect so that `left <= right` and `top <= bottom`. */
function normalizeRect(r: Rect): Rect {
  const minX = Math.min(r.left, r.right);
  const maxX = Math.max(r.left, r.right);
  const minY = Math.min(r.top, r.bottom);
  const maxY = Math.max(r.top, r.bottom);
  return {
    type: 'rect',
    left: minX,
    top: minY,
    right: maxX,
    bottom: maxY,
  };
}

/**
 * Reason why drawing was canceled.
 *
 * "canceled" - The drawing was canceled, eg. by pressing Escape.
 * "restarted" - A new drawing operation was started, canceling the existing one.
 */
export type DrawErrorKind = 'canceled' | 'restarted';

/**
 * Errors while drawing a shape using {@link DrawTool}.
 */
export class DrawError extends Error {
  kind: DrawErrorKind;

  constructor(kind: DrawErrorKind, message = 'Drawing failed') {
    super(message);

    this.kind = kind;
  }
}

/** Specifies the type of shape to draw. */
export type Tool = 'rect' | 'point';

/**
 * Tool for drawing shapes for use as the target region of an annotation.
 *
 * When drawing is active, DrawTool creates an overlay into which the incomplete
 * shape is drawn. The shape is updated in response to user gestures.
 * Drawing is initiated using {@link DrawTool.draw}. Only one shape can be
 * drawn at a time.
 */
export class DrawTool implements Destroyable {
  private _container: HTMLElement;

  /** Surface for current drawing. */
  private _surface?: SVGSVGElement;

  private _tool: Tool;

  /** Current drawing shape. */
  private _shape?: Rect | Point;

  /** Callback for when draw operation ends successfully. */
  private _drawEnd?: (s: Shape) => void;

  /** Callback for when draw operation ends with an error. */
  private _drawError?: (e: DrawError) => void;

  /** Controller for ending the drawing operation. */
  private _abortDraw?: AbortController;

  /** For rectangle tool: track if we're in two-click mode (waiting for second click). */
  private _waitingForSecondClick: boolean = false;

  /** For rectangle tool: initial click position when in two-click mode. */
  private _firstClickPoint?: { x: number; y: number };

  /** For rectangle tool: track if pointer moved significantly (indicating drag). */
  private _hasMoved: boolean = false;

  /** Threshold in pixels to distinguish between click and drag. */
  private readonly _dragThreshold = 5;

  /** Keyboard mode: 'move' for moving, 'resize' for resizing, 'rect' for rectangle, null when inactive */
  private _keyboardMode: KeyboardMode = null;

  /** Whether keyboard mode is currently active */
  private _keyboardActive: boolean = false;

  /** Which corner is pinned during resize mode */
  private _pinnedCorner: PinnedCorner = 'top-left';

  /** Increment for keyboard movement (pixels) */
  private readonly _keyboardMoveIncrement = 10;

  /** Increment for keyboard movement with Shift (pixels) */
  private readonly _keyboardMoveIncrementLarge = 50;

  /** Default size for rectangle when initialized via keyboard (pixels) */
  private readonly _defaultRectangleSize = 30;

  /** Minimum size for rectangle (pixels) */
  private readonly _minRectangleSize = 20;

  /** Maximum size for rectangle (pixels) - relative to container */
  private readonly _maxRectangleSizeRatio = 0.95; // 95% of container

  /** Container for the announcer component */
  private _announcerContainer?: HTMLElement;

  /** Container for the keyboard indicator component */
  private _indicatorContainer?: HTMLElement;

  /** Scroll listener for updating rectangle position when scrolling */
  private _scrollListener?: () => void;

  /** Timeout ID for debouncing scroll events */
  private _scrollDebounceTimeout?: number;

  /**
   * @param root - Container in which the user can draw a shape. The drawing
   *   layer is positioned to fill the container using `position: absolute`.
   *   It is the caller's responsibility to make sure the container is
   *   positioned if needed.
   */
  constructor(root: HTMLElement) {
    this._container = root;
    this._tool = 'rect';

    // Create containers for the announcer and indicator components
    this._announcerContainer = document.createElement('div');
    this._announcerContainer.setAttribute(
      'data-testid',
      'draw-tool-announcer-container',
    );
    root.appendChild(this._announcerContainer);

    this._indicatorContainer = document.createElement('div');
    this._indicatorContainer.setAttribute(
      'data-testid',
      'draw-tool-indicator-container',
    );
    root.appendChild(this._indicatorContainer);
  }

  destroy() {
    this.cancel();
    this._announcerContainer?.remove();
    this._announcerContainer = undefined;
    this._indicatorContainer?.remove();
    this._indicatorContainer = undefined;
    // Clean up scroll listener
    this._removeScrollListener();
  }

  /**
   * Get the current keyboard mode state.
   * @return Object with keyboardActive and keyboardMode properties
   */
  getKeyboardModeState(): {
    keyboardActive: boolean;
    keyboardMode: KeyboardMode;
  } {
    // If keyboard is active but mode is null, default to 'rect'
    const mode =
      this._keyboardActive && this._keyboardMode === null
        ? 'rect'
        : this._keyboardMode;
    return {
      keyboardActive: this._keyboardActive,
      keyboardMode: mode,
    };
  }

  /**
   * Begin drawing a shape.
   *
   * @param tool - Type of shape to draw
   * @return - Promise for the shape drawn by the user
   */
  async draw(tool: Tool, initialMode?: 'move' | 'resize'): Promise<Shape> {
    this._tool = tool;

    // Only one drawing operation can be in progress at a time.
    this.cancel('restarted');

    // Create a transparent SVG canvas overlaid on top of the container, with
    // a crosshair cursor to indicate the user can click to draw.
    const surface = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    surface.setAttribute('data-testid', 'surface');
    surface.style.cursor = 'crosshair';

    // Allow the user to draw on the surface on touch devices using finger or
    // stylus.
    surface.style.touchAction = 'none';

    // Make the drawing surface fill the container.
    surface.style.position = 'absolute';
    surface.setAttribute('width', '100%');
    surface.setAttribute('height', '100%');
    surface.style.left = '0px';
    surface.style.top = '0px';

    // Raise the drawing surface above other content. The initial value here is
    // "good enough" for use in PDF.js but will have to change when we support
    // image annotation in other formats.
    surface.style.zIndex = '10';

    this._container.append(surface);
    this._surface = surface;

    const { promise: shape, resolve, reject } = promiseWithResolvers<Shape>();
    this._drawEnd = resolve;
    this._drawError = reject;

    // Reset two-click mode state
    this._waitingForSecondClick = false;
    this._firstClickPoint = undefined;
    this._hasMoved = false;

    this._surface.addEventListener('pointerdown', e => {
      switch (this._tool) {
        case 'rect':
          // If we're waiting for a second click, this is the second click
          if (this._waitingForSecondClick && this._firstClickPoint) {
            // Complete the rectangle with the second click
            this._shape = {
              type: 'rect',
              left: this._firstClickPoint.x,
              top: this._firstClickPoint.y,
              right: e.clientX,
              bottom: e.clientY,
            };
            this._waitingForSecondClick = false;
            this._firstClickPoint = undefined;
            resolve(normalizeRect(this._shape));
            this._abortDraw?.abort();
            e.stopPropagation();
            return;
          }

          // First click: initialize rectangle and track position
          this._shape = {
            type: 'rect',
            left: e.clientX,
            top: e.clientY,
            right: e.clientX,
            bottom: e.clientY,
          };
          this._hasMoved = false;
          this._renderSurface();
          break;
        case 'point':
          this._shape = {
            type: 'point',
            x: e.clientX,
            y: e.clientY,
          };
          break;
      }
      this._renderSurface();
    });

    this._surface.addEventListener('pointermove', e => {
      if (!this._shape) {
        return;
      }
      switch (this._shape.type) {
        case 'rect':
          // Check if pointer has moved significantly (indicating drag)
          if (!this._hasMoved) {
            const deltaX = Math.abs(e.clientX - this._shape.left);
            const deltaY = Math.abs(e.clientY - this._shape.top);
            this._hasMoved =
              deltaX >= this._dragThreshold || deltaY >= this._dragThreshold;
          }

          // Update rectangle during drag
          this._shape.right = e.clientX;
          this._shape.bottom = e.clientY;
          break;
        case 'point':
          this._shape.x = e.clientX;
          this._shape.y = e.clientY;
          break;
      }
      this._renderSurface();
    });

    this._surface.addEventListener('pointerup', e => {
      // If we're waiting for second click, don't process pointerup
      // (the second click will be handled in pointerdown)
      if (this._waitingForSecondClick) {
        e.stopPropagation();
        return;
      }

      if (!this._shape) {
        return;
      }
      switch (this._shape.type) {
        case 'rect':
          // If there was significant movement, treat as drag and complete immediately
          if (this._hasMoved) {
            this._shape.right = e.clientX;
            this._shape.bottom = e.clientY;
            resolve(normalizeRect(this._shape));
          } else {
            // Check if pointerup is at approximately the same position as pointerdown
            // (within threshold) to determine if we should enter two-click mode
            const deltaX = Math.abs(e.clientX - this._shape.left);
            const deltaY = Math.abs(e.clientY - this._shape.top);
            const isAtSamePosition =
              deltaX < this._dragThreshold && deltaY < this._dragThreshold;

            if (isAtSamePosition) {
              // No movement: treat as first click in two-click mode
              // Store the first click position and wait for second click
              this._firstClickPoint = {
                x: this._shape.left,
                y: this._shape.top,
              };
              this._waitingForSecondClick = true;
              // Keep the shape visible as a point indicator
              this._renderSurface();
              // Don't resolve yet - wait for second click
              e.stopPropagation();
              return;
            } else {
              // Some movement but less than threshold: complete the rectangle
              this._shape.right = e.clientX;
              this._shape.bottom = e.clientY;
              resolve(normalizeRect(this._shape));
            }
          }
          break;
        case 'point':
          this._shape.x = e.clientX;
          this._shape.y = e.clientY;
          resolve(this._shape);
          break;
      }
      this._abortDraw?.abort();

      // Prevent event from propagating to the Guest's event handlers, as this
      // will trigger selection of any existing highlights containing the
      // position of this event.
      e.stopPropagation();
    });

    // Enable user to scroll elements under the drawing surface by translating
    // wheel events to scroll actions.
    this._surface.addEventListener('wheel', e => {
      // Remaining amount of scroll delta.
      let scrollDeltaY = Math.abs(e.deltaY);
      let scrollDeltaX = Math.abs(e.deltaX);

      // Visit elements from top-most to bottom-most and transfer remaining
      // unused scroll delta to them.
      for (const elem of document.elementsFromPoint(e.clientX, e.clientY)) {
        const prevScrollLeft = elem.scrollLeft;
        elem.scrollLeft += scrollDeltaX * Math.sign(e.deltaX);
        scrollDeltaX -= Math.abs(elem.scrollLeft - prevScrollLeft);

        const prevScrollTop = elem.scrollTop;
        elem.scrollTop += scrollDeltaY * Math.sign(e.deltaY);
        scrollDeltaY -= Math.abs(elem.scrollTop - prevScrollTop);
      }
    });

    this._abortDraw = new AbortController();

    document.body.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        // Don't intercept when the user is typing in an editable context - WCAG 2.1.4.
        if (isEditableContext(e.target)) {
          return;
        }

        if (e.key === 'Escape') {
          if (this._keyboardActive) {
            this._deactivateKeyboardMode();
          }
          if (this._drawError) {
            this._drawError(new DrawError('canceled', 'Drawing canceled'));
          }
          this._abortDraw?.abort();
          return;
        }

        // Only process keyboard navigation if keyboard mode is active
        // Note: Ctrl+Shift+Y, Ctrl+Shift+J, and Ctrl+Shift+U are handled by the global listener in guest.ts
        if (!this._keyboardActive) {
          return;
        }

        // Tab: Cycle through pinned corners in resize mode
        if (
          e.key === 'Tab' &&
          this._keyboardMode === 'resize' &&
          this._tool === 'rect'
        ) {
          e.preventDefault();
          e.stopPropagation();
          const currentIndex = RESIZE_CORNERS_ORDER.indexOf(this._pinnedCorner);
          const nextIndex = (currentIndex + 1) % RESIZE_CORNERS_ORDER.length;
          this._pinnedCorner = RESIZE_CORNERS_ORDER[nextIndex];
          this._updateAnnouncer();
          this._renderSurface();
          return;
        }

        // Enter: Confirm and create annotation
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (this._shape) {
            if (this._shape.type === 'rect') {
              resolve(normalizeRect(this._shape));
            } else {
              resolve(this._shape);
            }
            this._deactivateKeyboardMode();
            this._abortDraw?.abort();
          }
          return;
        }

        // Arrow keys: Move or resize
        if (
          ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
          const increment = e.shiftKey
            ? this._keyboardMoveIncrementLarge
            : this._keyboardMoveIncrement;
          this._handleArrowKey(e.key, increment);
          return;
        }
      },
      {
        signal: this._abortDraw.signal,
      },
    );

    // Cleanup when drawing is aborted
    this._abortDraw.signal.onabort = () => {
      this._surface?.remove();
      this._shape = undefined;
      this._surface = undefined;
      this._drawError = undefined;
      this._drawEnd = undefined;
      this._abortDraw = undefined;
      this._waitingForSecondClick = false;
      this._firstClickPoint = undefined;
      this._hasMoved = false;
      this._deactivateKeyboardMode();
    };

    // If initialMode is provided, activate keyboard mode with that mode
    if (initialMode) {
      this._activateKeyboardMode();
      this._keyboardMode = initialMode;
      this._updateAnnouncer();
    }

    // Draw the initial empty surface
    this._renderSurface();

    return shape;
  }

  /**
   * Minimum distance from the top of the viewport for the rectangle.
   * Keeps the rectangle below app header and document toolbar so it isn't hidden.
   */
  private static readonly _RESERVED_VIEWPORT_TOP = 40;

  /** Update shape position based on scroll and visible content (e.g. PDF pages). */
  private _updateRectanglePosition() {
    this._shape = computeInitialShapePosition(
      this._container,
      this._shape,
      this._tool,
      {
        defaultRectangleSize: this._defaultRectangleSize,
        reservedViewportTop: DrawTool._RESERVED_VIEWPORT_TOP,
      },
    );
    this._renderSurface();
  }

  /**
   * Set up scroll listener to update rectangle position when scrolling.
   */
  private _setupScrollListener() {
    // Remove existing listener if any
    this._removeScrollListener();

    // Create debounced scroll handler
    this._scrollListener = () => {
      // Clear existing timeout
      if (this._scrollDebounceTimeout !== undefined) {
        window.clearTimeout(this._scrollDebounceTimeout);
      }

      // Debounce scroll events (50ms delay for smoother experience)
      this._scrollDebounceTimeout = window.setTimeout(() => {
        if (this._keyboardActive && this._shape?.type === 'rect') {
          // Update rectangle position to follow scroll
          this._updateRectanglePosition();
          this._updateAnnouncer();
        }
      }, 50);
    };

    // Add scroll listener to container
    this._container.addEventListener('scroll', this._scrollListener, {
      passive: true,
    });
  }

  /**
   * Remove scroll listener and clean up.
   */
  private _removeScrollListener() {
    if (this._scrollListener) {
      this._container.removeEventListener('scroll', this._scrollListener);
      this._scrollListener = undefined;
    }
    if (this._scrollDebounceTimeout !== undefined) {
      window.clearTimeout(this._scrollDebounceTimeout);
      this._scrollDebounceTimeout = undefined;
    }
  }

  /**
   * Activate keyboard mode for drawing.
   * Initializes the shape at the top-left corner of the visible content area if it doesn't exist.
   */
  private _activateKeyboardMode() {
    this._keyboardActive = true;
    // Start in 'rect' mode (no specific keyboard mode active yet)
    this._keyboardMode = null;
    // Reset pinned corner to top-left when activating keyboard mode
    this._pinnedCorner = 'top-left';

    // Initialize shape at top-left corner of visible content area if it doesn't exist
    if (!this._shape) {
      this._updateRectanglePosition();
    }

    // Set up scroll listener to update rectangle position when scrolling
    this._setupScrollListener();

    this._updateAnnouncer();
  }

  /**
   * Deactivate keyboard mode.
   */
  private _deactivateKeyboardMode() {
    this._keyboardActive = false;
    this._keyboardMode = null;
    this._pinnedCorner = 'top-left';
    // Remove scroll listener
    this._removeScrollListener();
    this._updateAnnouncer();
  }

  /** Handle arrow key navigation for moving or resizing. */
  private _handleArrowKey(key: string, increment: number) {
    if (!this._shape || !this._keyboardMode) {
      return;
    }

    const viewport = getViewportBounds(
      this._container,
      DrawTool._RESERVED_VIEWPORT_TOP,
    );

    if (this._shape.type === 'point' && this._keyboardMode === 'move') {
      this._shape = applyMoveArrowKeyToPoint(
        this._shape,
        key,
        increment,
        viewport,
      );
      this._renderSurface();
      this._updateAnnouncer();
      return;
    }

    if (this._shape.type === 'rect') {
      const normalized = normalizeRect(this._shape);
      if (this._keyboardMode === 'move') {
        this._shape = clampRectToViewport(
          applyMoveArrowKeyToRect(normalized, key, increment, viewport),
          viewport,
        );
        this._renderSurface();
        this._updateAnnouncer();
        return;
      }
      if (this._keyboardMode === 'resize') {
        if (!canModifyFromPinnedCorner(key, this._pinnedCorner)) {
          return;
        }
        const viewportWidth = viewport.maxRight - viewport.minLeft;
        const viewportHeight = viewport.maxBottom - viewport.minTop;
        const constraints = {
          minWidth: this._minRectangleSize,
          minHeight: this._minRectangleSize,
          maxWidth: viewportWidth * this._maxRectangleSizeRatio,
          maxHeight: viewportHeight * this._maxRectangleSizeRatio,
          increment,
        };
        this._shape = clampRectToViewport(
          applyResizeArrowKey(normalized, key, this._pinnedCorner, constraints),
          viewport,
        );
        this._renderSurface();
        this._updateAnnouncer();
      }
    }
  }

  /** Callback to notify when keyboard mode state changes */
  private _onKeyboardModeChange?: (state: {
    keyboardActive: boolean;
    keyboardMode: KeyboardMode;
  }) => void;

  /**
   * Set callback to be notified when keyboard mode state changes.
   * Pass undefined to clear the callback.
   */
  setOnKeyboardModeChange(
    callback?: (state: {
      keyboardActive: boolean;
      keyboardMode: KeyboardMode;
    }) => void,
  ) {
    this._onKeyboardModeChange = callback;
  }

  /**
   * Set the keyboard mode programmatically.
   * This is used when the user clicks the mode button in the toolbar.
   */
  setKeyboardMode(mode: 'move' | 'resize' | 'rect') {
    if (!this._keyboardActive) {
      // Activate keyboard mode first if not active
      this._activateKeyboardMode();
    }
    if (this._keyboardMode !== mode) {
      this._keyboardMode = mode;
      // Reset pinned corner to top-left when switching to resize mode
      if (mode === 'resize') {
        this._pinnedCorner = 'top-left';
      }
      // If switching to 'rect' mode, deactivate keyboard navigation (just show rectangle)
      if (mode === 'rect') {
        // Keep keyboard active but disable move/resize navigation
        // The rectangle will still be visible and can be moved/resized with mouse
      }
      this._updateAnnouncer();
      this._renderSurface();
    }
  }

  /**
   * Update the announcer and indicator components with current state.
   */
  private _updateAnnouncer() {
    if (!this._announcerContainer || !this._indicatorContainer) {
      return;
    }

    let x: number | undefined;
    let y: number | undefined;
    let width: number | undefined;
    let height: number | undefined;

    if (this._shape) {
      if (this._shape.type === 'point') {
        x = this._shape.x;
        y = this._shape.y;
      } else {
        const normalized = normalizeRect(this._shape);
        x = normalized.left;
        y = normalized.top;
        width = normalized.right - normalized.left;
        height = normalized.bottom - normalized.top;
      }
    }

    // Convert null mode to 'rect' for display (when keyboard is active but no specific mode)
    const displayMode: 'move' | 'resize' | 'rect' | null =
      this._keyboardActive && this._keyboardMode === null
        ? 'rect'
        : this._keyboardMode;

    render(
      <DrawToolAnnouncer
        mode={displayMode}
        tool={this._tool}
        x={x}
        y={y}
        width={width}
        height={height}
        keyboardActive={this._keyboardActive}
        pinnedCorner={this._pinnedCorner}
      />,
      this._announcerContainer,
    );

    render(
      <DrawToolKeyboardIndicator
        mode={displayMode}
        keyboardActive={this._keyboardActive}
        pinnedCorner={this._pinnedCorner}
      />,
      this._indicatorContainer,
    );

    // Notify about keyboard mode state change (convert null to 'rect' for external state)
    if (this._onKeyboardModeChange) {
      this._onKeyboardModeChange({
        keyboardActive: this._keyboardActive,
        keyboardMode: displayMode,
      });
    }
  }

  /**
   * Cancel any drawing which is in progress.
   *
   * Pending promises returned by {@link DrawTool.draw} will reject.
   */
  cancel(kind: DrawErrorKind = 'canceled') {
    if (this._drawError) {
      this._drawError(new DrawError(kind, 'Drawing canceled'));
    }
    this._abortDraw?.abort();
    // Reset two-click mode state
    this._waitingForSecondClick = false;
    this._firstClickPoint = undefined;
    this._hasMoved = false;
  }

  private _renderSurface() {
    /* istanbul ignore next */
    if (!this._surface) {
      return;
    }
    if (this._keyboardActive) {
      this._updateAnnouncer();
    }
    render(
      <DrawToolSurface
        shape={this._shape}
        waitingForSecondClick={this._waitingForSecondClick}
        firstClickPoint={this._firstClickPoint}
        keyboardMode={this._keyboardMode}
        keyboardActive={this._keyboardActive}
        pinnedCorner={this._pinnedCorner}
      />,
      this._surface,
    );
  }
}
