import { render } from 'preact';

import { promiseWithResolvers } from '../shared/promise-with-resolvers';
import type { Destroyable, Rect, Shape } from '../types/annotator';

function isPositioned(el: HTMLElement) {
  return getComputedStyle(el).position !== 'static';
}

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
 * Errors while drawing a shape using {@link DrawTool}.
 */
export class DrawError extends Error {
  constructor(message = 'Drawing failed') {
    super(message);
  }
}

/** Specifies the type of shape to draw. */
export type Tool = 'rect' | 'point';

/**
 * Tool for drawing shapes for use as the target region of an annotation.
 *
 * When drawing is active, DrawTool creates an overlay into which the incomplete
 * shape is drawn. The shape is updated in response to user gestures.
 *
 * Drawing is initiated using {@link DrawTool.draw}. Only one shape can be
 * drawn at a time.
 */
export class DrawTool implements Destroyable {
  private _container: HTMLElement;

  /** Surface for current drawing. */
  private _surface?: SVGSVGElement;

  private _tool: Tool;

  /** Current drawing shape. */
  private _shape?: Rect;

  /** Callback for when draw operation ends successfully. */
  private _drawEnd?: (s: Shape) => void;

  /** Callback for when draw operation ends with an error. */
  private _drawError?: (e: DrawError) => void;

  /** Controller for ending the drawing operation. */
  private _abortDraw?: AbortController;

  /**
   * @param root - Container in which the user can draw a shape
   */
  constructor(root: HTMLElement) {
    this._container = root;
    this._tool = 'rect';
    if (!isPositioned(root)) {
      root.style.position = 'relative';
    }
  }

  destroy() {
    this.cancel();
  }

  /**
   * Begin drawing a shape.
   *
   * @param tool - Type of shape to draw
   * @return - Promise for the shape drawn by the user
   */
  async draw(tool: Tool): Promise<Shape> {
    this._tool = tool;

    // Only one drawing operation can be in progress at a time.
    this.cancel();

    // Create a transparent SVG canvas overlaid on top of the container, with
    // a crosshair cursor to indicate the user can click to draw.
    const surface = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    surface.setAttribute('data-testid', 'surface');
    surface.setAttribute('width', '100%');
    surface.setAttribute('height', '100%');
    surface.style.cursor = 'crosshair';
    surface.style.position = 'absolute';
    surface.style.left = '0px';
    surface.style.top = '0px';
    surface.style.zIndex = '10';
    this._container.append(surface);
    this._surface = surface;

    const { promise: shape, resolve, reject } = promiseWithResolvers<Shape>();
    this._drawEnd = resolve;
    this._drawError = reject;

    this._surface.addEventListener('mousedown', e => {
      switch (this._tool) {
        case 'rect':
          this._shape = {
            type: 'rect',
            left: e.clientX,
            top: e.clientY,
            right: e.clientX,
            bottom: e.clientY,
          };
          this._renderSurface();
          break;
        case 'point':
          resolve({
            type: 'point',
            x: e.clientX,
            y: e.clientY,
          });
          this._abortDraw?.abort();
          break;
      }
    });

    this._surface.addEventListener('mousemove', e => {
      if (!this._shape) {
        return;
      }

      this._shape.right = e.clientX;
      this._shape.bottom = e.clientY;
      this._renderSurface();
    });

    this._surface.addEventListener('mouseup', e => {
      if (!this._shape) {
        return;
      }
      this._shape.right = e.clientX;
      this._shape.bottom = e.clientY;
      resolve(normalizeRect(this._shape));
      this._abortDraw?.abort();
    });

    // Cancel drawing if user presses "Escape"
    this._abortDraw = new AbortController();
    document.body.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key !== 'Escape') {
          return;
        }
        if (this._drawError) {
          this._drawError(new DrawError('Drawing canceled'));
        }
        this._abortDraw?.abort();
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
    };

    // Draw the initial empty surface
    this._renderSurface();

    return shape;
  }

  /**
   * Cancel any drawing which is in progress.
   *
   * Pending promises returned by {@link DrawTool.draw} will reject.
   */
  cancel() {
    if (this._drawError) {
      this._drawError(new DrawError('Drawing canceled'));
    }
    this._abortDraw?.abort();
  }

  private _renderSurface() {
    /* istanbul ignore next */
    if (!this._surface) {
      return;
    }
    if (this._shape?.type === 'rect') {
      // Normalize rect because SVG rects must have positive width and height.
      const rect = normalizeRect(this._shape);
      render(
        <rect
          stroke="black"
          stroke-dasharray="3"
          stroke-width="3px"
          fill="none"
          x={rect.left}
          y={rect.top}
          width={rect.right - rect.left}
          height={rect.bottom - rect.top}
        />,
        this._surface,
      );
    } else {
      render(null, this._surface);
    }
  }
}
