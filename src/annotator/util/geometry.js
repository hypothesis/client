/**
 * Return the intersection of two rects.
 *
 * @param {DOMRect} rectA
 * @param {DOMRect} rectB
 */
export function intersectRects(rectA, rectB) {
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
 *
 * @param {DOMRect} rect
 */
export function rectIsEmpty(rect) {
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
 *
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} d
 */
function linesOverlap(a, b, c, d) {
  const maxStart = Math.max(a, c);
  const minEnd = Math.min(b, d);
  return maxStart < minEnd;
}

/**
 * Return true if the intersection of `rectB` and `rectA` is non-empty.
 *
 * @param {DOMRect} rectA
 * @param {DOMRect} rectB
 */
export function rectIntersects(rectA, rectB) {
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
 *
 * @param {DOMRect} rectA
 * @param {DOMRect} rectB
 */
export function rectContains(rectA, rectB) {
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
