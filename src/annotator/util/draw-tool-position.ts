import type { Rect, Shape } from '../../types/annotator';
import type { ViewportBounds } from './rect-move';

/**
 * Normalize a rect so that `left <= right` and `top <= bottom`.
 */
export function normalizeRect(r: Rect): Rect {
  return {
    type: 'rect',
    left: Math.min(r.left, r.right),
    top: Math.min(r.top, r.bottom),
    right: Math.max(r.left, r.right),
    bottom: Math.max(r.top, r.bottom),
  };
}

export type ComputePositionOptions = {
  defaultRectangleSize: number;
  reservedViewportTop: number;
};

/**
 * Compute the initial shape position for keyboard drawing, based on container
 * scroll and visible content (e.g. PDF pages). Used when activating keyboard
 * mode or when the user has not yet drawn a shape.
 *
 * @param container - The draw tool container element
 * @param existingShape - Current shape if any (size preserved for rect)
 * @param tool - 'rect' or 'point'
 * @param options - Sizing and viewport options
 * @returns The shape to display at the computed position
 */
export function computeInitialShapePosition(
  container: HTMLElement,
  existingShape: Shape | undefined,
  tool: 'rect' | 'point',
  options: ComputePositionOptions,
): Shape {
  const { defaultRectangleSize, reservedViewportTop } = options;
  const containerRect = container.getBoundingClientRect();
  const scrollLeft = container.scrollLeft || 0;
  const scrollTop = container.scrollTop || 0;

  let startX = scrollLeft;
  let startY = scrollTop;

  const pages = container.querySelectorAll('.page') as NodeListOf<HTMLElement>;
  let bestPage: HTMLElement | null = null;
  let maxVisibleArea = 0;

  for (const page of pages) {
    const pageRect = page.getBoundingClientRect();
    const visibleTop = Math.max(
      pageRect.top,
      containerRect.top,
      reservedViewportTop,
    );
    const visibleBottom = Math.min(pageRect.bottom, containerRect.bottom);
    const visibleLeft = Math.max(pageRect.left, containerRect.left);
    const visibleRight = Math.min(pageRect.right, containerRect.right);
    const visibleWidth = Math.max(0, visibleRight - visibleLeft);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibleArea = visibleWidth * visibleHeight;

    if (
      visibleArea > 0 &&
      pageRect.bottom > containerRect.top + 50 &&
      pageRect.top < containerRect.bottom - 50
    ) {
      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        bestPage = page;
      }
    }
  }

  if (bestPage) {
    const pageRect = bestPage.getBoundingClientRect();
    const visibleTop = Math.max(
      pageRect.top,
      containerRect.top,
      reservedViewportTop,
    );
    const visibleLeft = Math.max(pageRect.left, containerRect.left);
    startX = visibleLeft - containerRect.left + scrollLeft;
    startY = visibleTop - containerRect.top + scrollTop;
    startX += 10;
    startY += 10;
  } else {
    startX += 10;
    startY = Math.max(
      scrollTop + 10,
      reservedViewportTop - containerRect.top + scrollTop + 10,
    );
  }

  if (existingShape && existingShape.type === 'rect') {
    const width = existingShape.right - existingShape.left;
    const height = existingShape.bottom - existingShape.top;
    return {
      type: 'rect',
      left: startX,
      top: startY,
      right: startX + width,
      bottom: startY + height,
    };
  }

  if (tool === 'point') {
    return { type: 'point', x: startX, y: startY };
  }

  return {
    type: 'rect',
    left: startX,
    top: startY,
    right: startX + defaultRectangleSize,
    bottom: startY + defaultRectangleSize,
  };
}

/**
 * Get viewport bounds in container content coordinates (same as shape left/top/right/bottom).
 */
export function getViewportBounds(
  container: HTMLElement,
  reservedViewportTop: number,
): ViewportBounds {
  const containerRect = container.getBoundingClientRect();
  const scrollLeft = container.scrollLeft || 0;
  const scrollTop = container.scrollTop || 0;
  const minTop =
    scrollTop + Math.max(0, reservedViewportTop - containerRect.top);
  return {
    minLeft: scrollLeft,
    minTop,
    maxRight: scrollLeft + container.clientWidth,
    maxBottom: scrollTop + container.clientHeight,
  };
}

/**
 * Clamp a rectangle to viewport bounds. Returns a new rect.
 */
export function clampRectToViewport(
  rect: Rect,
  viewport: ViewportBounds,
): Rect {
  const r = normalizeRect(rect);
  const width = r.right - r.left;
  const height = r.bottom - r.top;
  const left = Math.max(
    viewport.minLeft,
    Math.min(r.left, viewport.maxRight - width),
  );
  const top = Math.max(
    viewport.minTop,
    Math.min(r.top, viewport.maxBottom - height),
  );
  return {
    type: 'rect',
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}
