import { getBoundingClientRect } from '../highlighter';

/**
 * @typedef {import('../../types/annotator').Anchor} Anchor
 * @typedef {import('../../types/annotator').AnchorPosition} AnchorPosition
 */

/**
 * @typedef Bucket
 * @prop {Set<string>} tags - The annotation tags in this bucket
 * @prop {number} position - The vertical pixel offset where this bucket should
 *   appear in the bucket bar
 */

/**
 * @typedef BucketSet
 * @prop {Bucket} above - A single bucket containing all the annotation
 *   tags whose anchors are offscreen upwards
 * @prop {Bucket} below - A single bucket containing all the annotation
 *   tags which anchors are offscreen downwards
 * @prop {Bucket[]} buckets - On-screen buckets
 */

/**
 * @typedef WorkingBucket
 * @prop {Set<string>} tags - The annotation tags in this bucket
 * @prop {number} position - The computed position (offset) for this bucket,
 *   based on the current anchors. This is centered between `top` and `bottom`
 * @prop {number} top - The uppermost (lowest) vertical offset for the anchors
 *   in this bucket — the lowest `top` position value, akin to the top offset of
 *   a theoretical box drawn around all of the anchor highlights in this bucket
 * @prop {number} bottom - The bottommost (highest) vertical offset for the
 *   anchors in this bucket — the highest `top` position value, akin to the
 *   bottom of a theoretical box drawn around all of the anchor highlights in
 *   this bucket
 */

// Only anchors with top offsets between `BUCKET_TOP_THRESHOLD` and
// `window.innerHeight - BUCKET_BOTTOM_THRESHOLD` are considered "on-screen"
// and will be bucketed. This is to account for bucket-bar tool buttons (top
// and the height of the bottom navigation bucket (bottom)
const BUCKET_TOP_THRESHOLD = 137;
const BUCKET_BOTTOM_THRESHOLD = 22;
// Generated buckets of annotation anchor highlights should be spaced by
// at least this amount, in pixels
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
      top <= window.innerHeight - BUCKET_BOTTOM_THRESHOLD
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
 * Compute the top and bottom positions for the set of anchors' highlights, sorted
 * vertically, from top to bottom.
 *
 * @param {Anchor[]} anchors
 * @return {AnchorPosition[]}
 */
export function computeAnchorPositions(anchors) {
  /** @type {AnchorPosition[]} */
  const positions = [];

  anchors.forEach(({ annotation, highlights }) => {
    if (!highlights?.length) {
      return;
    }

    const { top, bottom } = getBoundingClientRect(highlights);

    if (top >= bottom) {
      // Empty rect. The highlights may be disconnected from the document or hidden.
      return;
    }

    positions.push({
      tag: annotation.$tag,
      top,
      bottom,
    });
  });

  // Sort anchors vertically from top to bottom
  positions.sort((anchor1, anchor2) => anchor1.top - anchor2.top);

  return positions;
}

/**
 * Compute buckets
 *
 * @param {AnchorPosition[]} anchorPositions
 * @return {BucketSet}
 */
export function computeBuckets(anchorPositions) {
  /** @type {Set<string>} */
  const aboveTags = new Set();
  /** @type {Set<string>} */
  const belowTags = new Set();
  /** @type {Bucket[]} */
  const buckets = [];

  // Hold current working anchors and positions as we build each bucket
  /** @type {WorkingBucket|null} */
  let currentBucket = null;

  /**
   * Create a new working bucket based on the provided `AnchorPosition`
   *
   * @param {AnchorPosition} anchorPosition
   * @return {WorkingBucket}
   */
  function newBucket({ bottom, tag, top }) {
    const anchorHeight = bottom - top;
    const bucketPosition = top + anchorHeight / 2;
    return {
      bottom,
      position: bucketPosition,
      tags: new Set([tag]),
      top,
    };
  }

  // Build buckets from position information
  anchorPositions.forEach(aPos => {
    if (aPos.top < BUCKET_TOP_THRESHOLD) {
      aboveTags.add(aPos.tag);
      return;
    } else if (aPos.top > window.innerHeight - BUCKET_BOTTOM_THRESHOLD) {
      belowTags.add(aPos.tag);
      return;
    }

    if (!currentBucket) {
      // We've encountered our first on-screen anchor position:
      // We'll need a bucket!
      currentBucket = newBucket(aPos);
      return;
    }
    // We want to contain overlapping highlights and those near each other
    // within a shared bucket
    const isContainedWithin =
      aPos.top > currentBucket.top && aPos.bottom < currentBucket.bottom;

    // The new anchor's position is far enough below the bottom of the current
    // bucket to justify starting a new bucket
    const isLargeGap = aPos.top - currentBucket.bottom > BUCKET_GAP_SIZE;

    if (isLargeGap && !isContainedWithin) {
      // We need to start a new bucket; push the working bucket and create
      // a new bucket
      buckets.push(currentBucket);
      currentBucket = newBucket(aPos);
    } else {
      // We'll add this anchor to the current working bucket and update
      // offset properties accordingly.
      // We can be confident that `aPos.top` is >= `currentBucket.top` because
      // AnchorPositions are sorted by their `top` offset — meaning that
      // `currentBucket.top` still accurately represents the `top` offset of
      // the virtual rectangle enclosing all anchors in this bucket. But
      // let's check to see if the bottom is larger/lower:
      const updatedBottom =
        aPos.bottom > currentBucket.bottom ? aPos.bottom : currentBucket.bottom;
      const updatedHeight = updatedBottom - currentBucket.top;

      currentBucket.tags.add(aPos.tag);
      currentBucket.bottom = updatedBottom;
      currentBucket.position = currentBucket.top + updatedHeight / 2;
    }
  });

  if (currentBucket) {
    buckets.push(currentBucket);
  }

  // Add an upper "navigation" bucket with offscreen-above anchors
  const above = {
    tags: aboveTags,
    position: BUCKET_TOP_THRESHOLD,
  };

  // Add a lower "navigation" bucket with offscreen-below anchors
  const below = {
    tags: belowTags,
    position: window.innerHeight - BUCKET_BOTTOM_THRESHOLD,
  };

  return {
    above,
    below,
    buckets,
  };
}
