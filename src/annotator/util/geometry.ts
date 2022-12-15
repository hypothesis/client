/**
 * Return the intersection of two rects.
 */
export function intersectRects(rectA: DOMRect, rectB: DOMRect) {
  const left = Math.max(rectA.left, rectB.left);
  const right = Math.min(rectA.right, rectB.right);
  const top = Math.max(rectA.top, rectB.top);
  const bottom = Math.min(rectA.bottom, rectB.bottom);
  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Return `true` if a rect is _empty_.
 *
 * An empty rect is defined as one with zero or negative width/height, eg.
 * as returned by `new DOMRect()` or `Element.getBoundingClientRect()` for a
 * hidden element.
 */
export function rectIsEmpty(rect: DOMRect) {
  return rect.width <= 0 || rect.height <= 0;
}

/**
 * Return true if the 1D lines a-b and c-d overlap (ie. the length of their
 * intersection is non-zero).
 *
 * For example, the following lines overlap:
 *
 *   a----b
 *      c------d
 *
 * The inputs must be normalized such that b >= a and d >= c.
 */
function linesOverlap(a: number, b: number, c: number, d: number) {
  const maxStart = Math.max(a, c);
  const minEnd = Math.min(b, d);
  return maxStart < minEnd;
}

/**
 * Return true if the intersection of `rectB` and `rectA` is non-empty.
 */
export function rectIntersects(rectA: DOMRect, rectB: DOMRect) {
  if (rectIsEmpty(rectA) || rectIsEmpty(rectB)) {
    return false;
  }

  return (
    linesOverlap(rectA.left, rectA.right, rectB.left, rectB.right) &&
    linesOverlap(rectA.top, rectA.bottom, rectB.top, rectB.bottom)
  );
}

/**
 * Return true if `rectB` is fully contained within `rectA`
 */
export function rectContains(rectA: DOMRect, rectB: DOMRect) {
  if (rectIsEmpty(rectA) || rectIsEmpty(rectB)) {
    return false;
  }

  return (
    rectB.left >= rectA.left &&
    rectB.right <= rectA.right &&
    rectB.top >= rectA.top &&
    rectB.bottom <= rectA.bottom
  );
}

/**
 * Return true if two rects overlap vertically.
 */
export function rectsOverlapVertically(a: DOMRect, b: DOMRect) {
  return linesOverlap(a.top, a.bottom, b.top, b.bottom);
}

/**
 * Return true if two rects overlap horizontally.
 */
export function rectsOverlapHorizontally(a: DOMRect, b: DOMRect) {
  return linesOverlap(a.left, a.right, b.left, b.right);
}

/**
 * Return the union of two rects.
 *
 * The union of an empty rect (see {@link rectIsEmpty}) with a non-empty rect is
 * defined to be the non-empty rect. The union of two empty rects is an empty
 * rect.
 */
export function unionRects(a: DOMRect, b: DOMRect) {
  if (rectIsEmpty(a)) {
    return b;
  } else if (rectIsEmpty(b)) {
    return a;
  }

  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  const right = Math.max(a.right, b.right);
  const bottom = Math.max(a.bottom, b.bottom);

  return new DOMRect(left, top, right - left, bottom - top);
}

/**
 * Return the point at the center of a rect.
 */
export function rectCenter(rect: DOMRect) {
  return new DOMPoint(
    (rect.left + rect.right) / 2,
    (rect.top + rect.bottom) / 2
  );
}
