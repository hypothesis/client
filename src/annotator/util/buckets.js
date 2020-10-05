import { getBoundingClientRect } from '../highlighter';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 */

/**
 * A tuple representing either the top (`startOrEnd` = 1) or the
 * bottom (`startOrEnd` = -1) of an anchor's highlight bounding box.
 *
 * @typedef {[pixelPosition: number, startOrEnd: (-1 | 1), anchor: Anchor]} PositionPoint
 */

/**
 * An object containing information about anchor highlight positions
 *
 * @typedef PositionPoints
 * @prop {Anchor[]} above - Anchors that are offscreen above
 * @prop {Anchor[]} below - Anchors that are offscreen below
 * @prop {PositionPoint[]} points - PositionPoints for on-screen anchor
 *   highlights. Each highlight box has 2 PositionPoints (one for top edge
 *   and one for bottom edge).
 */

/**
 * @typedef BucketInfo
 * @prop {Array<Anchor[]>} buckets
 * @prop {number[]} index - Array of (pixel) positions of each bucket
 */

// FIXME: Temporary duplication of size constants between here and BucketBar
const BUCKET_SIZE = 16; // Regular bucket size
const BUCKET_NAV_SIZE = BUCKET_SIZE + 6; // Bucket plus arrow (up/down)
const BUCKET_TOP_THRESHOLD = 115 + BUCKET_NAV_SIZE; // Toolbar

// TODO!! This is an option in the plugin right now
const BUCKET_GAP_SIZE = 60;

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
  const points = /** @type {PositionPoint[]} */ ([]);

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

/**
 * Take a sorted set of `points` representing top and bottom positions of anchor
 * highlights and group them into a collection of "buckets".
 *
 * @param {PositionPoint[]} points
 * @return {BucketInfo}
 */
export function buildBuckets(points) {
  const buckets = /** @type {Array<Anchor[]>} */ ([]);
  const bucketPositions = /** @type {number[]} */ ([]);

  // Anchors that are part of the currently-being-built bucket, and a correspon-
  // ding count of unclosed top edges seen for that anchor
  const current = /** @type {{anchors: Anchor[], counts: number[] }} */ ({
    anchors: [],
    counts: [],
  });

  points.forEach((point, index) => {
    const [position, delta, anchor] = point;
    // Does this point represent the top or the bottom of an anchor's highlight
    // box?
    const positionType = delta > 0 ? 'start' : 'end';

    // See if this point's anchor is already in our working set of open anchors
    const anchorIndex = current.anchors.indexOf(anchor);

    if (positionType === 'start') {
      if (anchorIndex === -1) {
        // Add an entry for this anchor to our current set of "open" anchors
        current.anchors.unshift(anchor);
        current.counts.unshift(1);
      } else {
        // Increment the number of times we've seen a start/top edge for this
        // anchor
        current.counts[anchorIndex]++;
      }
    } else {
      // positionType = 'end'
      // This is the bottom/end of an anchor that we should have already seen
      // a top edge for. Decrement the count, representing that we've found an
      // end point to balance a previously-seen start point
      current.counts[anchorIndex]--;
      if (current.counts[anchorIndex] === 0) {
        // All start points for this anchor have been balanced by end point(s)
        // So we can remove this anchor from our collection of open anchors
        current.anchors.splice(anchorIndex, 1);
        current.counts.splice(anchorIndex, 1);
      }
    }

    // For each point, we'll either:
    // * create a new bucket: Add a new bucket (w/corresponding bucket position)
    //   and add the working anchors to the new bucket. This, of course, has
    //   the effect of making the buckets collection larger. OR:
    // * merge buckets: In most cases, merge the anchors from the last bucket
    //   into the penultimate (previous) bucket and remove the last bucket (and
    //   its corresponding `bucketPosition` entry). Also add the working anchors
    //   to the previous bucket. Note that this decreases the size of the
    //   buckets collection.
    // The ultimate set of buckets is defined by the pattern of creating and
    // merging/removing buckets as we iterate over points.
    const isFirstOrLastPoint =
      bucketPositions.length === 0 || index === points.length - 1;

    const isLargeGap =
      bucketPositions.length &&
      position - bucketPositions[bucketPositions.length - 1] > BUCKET_GAP_SIZE;

    if (current.anchors.length === 0 || isFirstOrLastPoint || isLargeGap) {
      // Create a new bucket, because:
      // - There are no more open/working anchors, OR
      // - This is the first or last point, OR
      // - There's been a large dimensional gap since the last bucket's position
      buckets.push(current.anchors.slice());
      // Each bucket gets a corresponding entry in `bucketPositions` for the
      // pixel position of its eventual indicator in the bucket bar
      bucketPositions.push(position);
    } else {
      // Merge buckets
      // We will remove 2 (usually) or 1 (if there is only one) bucket
      // from the buckets collection, and re-add 1 merged bucket (always)

      // Always pop off the last bucket
      const ultimateBucket = buckets.pop() || [];

      // If there is a previous/penultimate bucket, pop that off, as well
      let penultimateBucket = [];
      if (buckets[buckets.length - 1]?.length) {
        penultimateBucket = buckets.pop() || [];
        // Because we're removing two buckets but only re-adding one below,
        // we'll end up with a misalignment in the `bucketPositions` collection.
        // Remove the last entry here, as it corresponds to the ultimate bucket,
        // which won't be re-added in its present form
        bucketPositions.pop();
      }
      // Create a merged bucket from the anchors in the penultimate bucket
      // (when available), ultimate bucket and current working anchors
      const activeBucket = Array.from(
        new Set([...penultimateBucket, ...ultimateBucket, ...current.anchors])
      );
      // Push the now-merged bucket onto the buckets collection
      buckets.push(activeBucket);
    }
  });
  return { buckets, index: bucketPositions };
}
