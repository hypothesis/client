import type { Point, Rect } from '../../types/annotator';

export type ViewportBounds = {
  minLeft: number;
  minTop: number;
  maxRight: number;
  maxBottom: number;
};

/**
 * Apply an arrow key to move a point, clamped to viewport bounds.
 * Returns a new point; does not mutate the input.
 */
export function applyMoveArrowKeyToPoint(
  point: Point,
  key: string,
  increment: number,
  viewport: ViewportBounds,
): Point {
  switch (key) {
    case 'ArrowUp':
      return { ...point, y: Math.max(viewport.minTop, point.y - increment) };
    case 'ArrowDown':
      return { ...point, y: Math.min(viewport.maxBottom, point.y + increment) };
    case 'ArrowLeft':
      return { ...point, x: Math.max(viewport.minLeft, point.x - increment) };
    case 'ArrowRight':
      return { ...point, x: Math.min(viewport.maxRight, point.x + increment) };
    default:
      return point;
  }
}

/**
 * Apply an arrow key to move a rectangle, clamped to viewport bounds.
 * Returns a new rect; does not mutate the input.
 */
export function applyMoveArrowKeyToRect(
  rect: Rect,
  key: string,
  increment: number,
  viewport: ViewportBounds,
): Rect {
  const { left, top, right, bottom } = rect;
  const width = right - left;
  const height = bottom - top;

  switch (key) {
    case 'ArrowUp': {
      const newTop = Math.max(viewport.minTop, top - increment);
      const deltaY = top - newTop;
      return {
        type: 'rect',
        left,
        top: newTop,
        right,
        bottom: bottom - deltaY,
      };
    }
    case 'ArrowDown': {
      const newBottom = Math.min(viewport.maxBottom, bottom + increment);
      const deltaY = newBottom - bottom;
      return {
        type: 'rect',
        left,
        top: top + deltaY,
        right,
        bottom: newBottom,
      };
    }
    case 'ArrowLeft': {
      const newLeft = Math.max(viewport.minLeft, left - increment);
      const deltaX = left - newLeft;
      return {
        type: 'rect',
        left: newLeft,
        top,
        right: right - deltaX,
        bottom,
      };
    }
    case 'ArrowRight': {
      const newRight = Math.min(viewport.maxRight, right + increment);
      const deltaX = newRight - right;
      return {
        type: 'rect',
        left: left + deltaX,
        top,
        right: newRight,
        bottom,
      };
    }
    default:
      return rect;
  }
}
