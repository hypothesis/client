import { getBoundingClientRect } from '../highlighter';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 */

// FIXME: Temporary duplication of size constants between here and BucketBar
const BUCKET_SIZE = 16; // Regular bucket size
const BUCKET_NAV_SIZE = BUCKET_SIZE + 6; // Bucket plus arrow (up/down)
const BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE; // Toolbar

/**
 * Find the closest valid anchor in `anchors` that is offscreen in the direction
 * indicated.
 *
 * @param {Anchor[]} anchors
 * @param {'up'|'down'} direction
 * @return {Anchor|null} - The closest anchor or `null` if no valid anchor found
 */
export function findClosestOffscreenAnchor(anchors, direction) {
  let closestAnchor = null;
  let closestTop = 0;

  for (let anchor of anchors) {
    if (!anchor.highlights?.length) {
      continue;
    }

    const top = getBoundingClientRect(anchor.highlights).top;

    // Verify that the anchor is offscreen in the direction we're headed
    if (direction === 'up' && top >= BUCKET_TOP_THRESHOLD) {
      // We're headed up but the anchor is already below the
      // visible top of the bucket bar: it's not our guy
      continue;
    } else if (
      direction === 'down' &&
      top <= window.innerHeight - BUCKET_NAV_SIZE
    ) {
      // We're headed down but this anchor is already above
      // the usable bottom of the screen: it's not our guy
      continue;
    }

    if (
      !closestAnchor ||
      (direction === 'up' && top > closestTop) ||
      (direction === 'down' && top < closestTop)
    ) {
      // This anchor is either:
      // - The first anchor we've encountered off-screen in the direction
      //   we're headed, or
      // - Closer to the screen than the previous `closestAnchor`
      closestAnchor = anchor;
      closestTop = top;
    }
  }

  return closestAnchor;
}

/**
 * A structured Array representing either the top or the bottom of an anchor's
 * highlight-box position.
 * @typedef {[number, (-1 | 1), Anchor]} PositionPoint
 */

/**
 * @typedef PositionPoints
 * @prop {Anchor[]} above - Anchors that are offscreen above
 * @prop {Anchor[]} below - Anchors that are offscreen below
 * @prop {PositionPoint[]} points - Points representing the tops and bottoms
 *   of on-screen anchor highlight boxes
 */
/**
 * Construct an Array of points representing the positional tops and bottoms
 * of current anchor highlights. Each anchor whose highlight(s)' bounding
 * box is onscreen will result in two entries in the `points` Array: one
 * for the top of the highlight box and one for the bottom
 *
 * @param {Anchor[]} anchors
 * @return {PositionPoints}
 */
export function constructPositionPoints(anchors) {
  const aboveScreenAnchors = new Set();
  const belowScreenAnchors = new Set();
  const points = /** @type {PositionPoint[]} */ (new Array());

  for (let anchor of anchors) {
    if (!anchor.highlights?.length) {
      continue;
    }

    const rect = getBoundingClientRect(anchor.highlights);

    if (rect.top < BUCKET_TOP_THRESHOLD) {
      aboveScreenAnchors.add(anchor);
    } else if (rect.top > window.innerHeight - BUCKET_NAV_SIZE) {
      belowScreenAnchors.add(anchor);
    } else {
      // Add a point for the top of this anchor's highlight box
      points.push([rect.top, 1, anchor]);
      // Add a point for the bottom of this anchor's highlight box
      points.push([rect.bottom, -1, anchor]);
    }
  }

  // Sort onscreen points by pixel position, secondarily by position "type"
  // (top or bottom of higlight box)
  points.sort((a, b) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i]) {
        return -1;
      } else if (a[i] > b[i]) {
        return 1;
      }
    }
    return 0;
  });

  return {
    above: Array.from(aboveScreenAnchors),
    below: Array.from(belowScreenAnchors),
    points,
  };
}
