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
 * @typedef Bucket
 * @prop {Anchor[]} anchors - The anchors in this bucket
 * @prop {number} position - The vertical pixel offset where this bucket should
 *                           appear in the bucket bar
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
 * @return {Bucket[]}
 */
export function buildBuckets(points) {
  const buckets = /** @type {Bucket[]} */ ([]);

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
      buckets.length === 0 || index === points.length - 1;

    const isLargeGap =
      buckets.length &&
      position - buckets[buckets.length - 1].position > BUCKET_GAP_SIZE;

    if (current.anchors.length === 0 || isFirstOrLastPoint || isLargeGap) {
      // Create a new bucket, because:
      // - There are no more open/working anchors, OR
      // - This is the first or last point, OR
      // - There's been a large dimensional gap since the last bucket's position
      buckets.push({ anchors: current.anchors.slice(), position });
    } else {
      // Merge bucket contents

      // Always remove the last bucket
      const ultimateBucket = buckets.pop() || /** @type Bucket */ ({});

      // Merge working anchors into the last bucket's anchors
      let mergedAnchors = [...ultimateBucket.anchors, ...current.anchors];
      let mergedPosition = ultimateBucket.position;

      // If there is a previous bucket (penultimate bucket) and it has anchors
      // in it (is not empty)
      if (buckets[buckets.length - 1]?.anchors.length) {
        // Remove the previous bucket, too
        const penultimateBucket = /** @type Bucket */ (buckets.pop() || {});
        // Merge the penultimate bucket's anchors into our working set of
        // merged anchors
        mergedAnchors = [...penultimateBucket.anchors, ...mergedAnchors];
        // We'll use the penultimate bucket's position as the position for
        // the merged bucket
        mergedPosition = penultimateBucket.position;
      }

      // Push the now-merged bucket onto the buckets collection
      buckets.push({
        anchors: Array.from(new Set(mergedAnchors)), // De-dupe anchors
        position: mergedPosition,
      });
    }
  });
  return buckets;
}
