import type { Anchor, AnchorPosition } from '../../types/annotator';
import { getBoundingClientRect } from '../highlighter';

export type Bucket = {
  /** The annotation tags in this bucket */
  tags: Set<string>;
  /** The vertical pixel offset where this bucket should appear in the bucket bar */
  position: number;
};

export type BucketSet = {
  /**
   * A single bucket containing all the annotation tags whose anchors are
   * offscreen upwards
   */
  above: Bucket;

  /**
   * A single bucket containing all the annotation tags which anchors are
   * offscreen downwards
   */
  below: Bucket;

  /** On-screen buckets */
  buckets: Bucket[];
};

export type WorkingBucket = {
  /** The annotation tags in this bucket */
  tags: Set<string>;

  /**
   * The computed position (offset) for this bucket, based on the current anchors.
   * This is centered between `top` and `bottom`
   */
  position: number;

  /**
   * The uppermost (lowest) vertical offset for the anchors in this bucket —
   * the lowest `top` position value, akin to the top offset of a theoretical
   * box drawn around all the anchor highlights in this bucket
   */
  top: number;

  /**
   * The bottommost (highest) vertical offset for the anchors in this bucket —
   * the highest `top` position value, akin to the bottom of a theoretical box
   * drawn around all the anchor highlights in this bucket
   */
  bottom: number;
};

// Generated buckets of annotation anchor highlights should be spaced by
// at least this amount, in pixels
const BUCKET_GAP_SIZE = 60;

/**
 * Find the closest valid anchor in `anchors` that is offscreen in the direction
 * indicated.
 *
 * @return The closest anchor or `null` if no valid anchor found
 */
export function findClosestOffscreenAnchor(
  anchors: Anchor[],
  direction: 'up' | 'down'
): Anchor | null {
  // Thresholds for how far away an anchor has to be from the top/bottom of
  // the viewport to be considered off-screen.
  const BUCKET_TOP_THRESHOLD = 137;
  const BUCKET_BOTTOM_THRESHOLD = 22;

  let closestAnchor = null;
  let closestTop = 0;

  for (const anchor of anchors) {
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
 */
export function computeAnchorPositions(anchors: Anchor[]): AnchorPosition[] {
  const positions: AnchorPosition[] = [];

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
 * Gap between the top/bottom of the container and the top/bottom of buckets.
 */
export const BUCKET_BAR_VERTICAL_MARGIN = 30;

/**
 * Group anchors into buckets and determine a suitable vertical position
 * for them within {@link container}.
 *
 * @param anchorPositions - Positions of anchors relative to viewport
 * @param container - Container into which buckets will be rendered
 */
export function computeBuckets(
  anchorPositions: AnchorPosition[],
  container: Element
): BucketSet {
  const aboveTags = new Set<string>();
  const belowTags = new Set<string>();
  const buckets: Bucket[] = [];

  // Hold current working anchors and positions as we build each bucket
  let currentBucket: WorkingBucket | null = null;

  /**
   * Create a new working bucket based on the provided `AnchorPosition`
   */
  function newBucket({ bottom, tag, top }: AnchorPosition): WorkingBucket {
    const anchorHeight = bottom - top;
    const bucketPosition = top + anchorHeight / 2;
    return {
      bottom,
      position: bucketPosition,
      tags: new Set([tag]),
      top,
    };
  }

  const containerRect = container.getBoundingClientRect();
  const vMargin = BUCKET_BAR_VERTICAL_MARGIN;

  // Compute positions of buckets relative to bucket bar instead of viewport.
  const relativePositions = anchorPositions.map(aPos => ({
    tag: aPos.tag,
    top: aPos.top - containerRect.top,
    bottom: aPos.bottom - containerRect.top,
  }));

  // Build buckets from position information
  for (const aPos of relativePositions) {
    const center = (aPos.top + aPos.bottom) / 2;

    if (center < vMargin) {
      aboveTags.add(aPos.tag);
      continue;
    } else if (center > containerRect.height - vMargin) {
      belowTags.add(aPos.tag);
      continue;
    }

    if (!currentBucket) {
      // We've encountered our first on-screen anchor position:
      // We'll need a bucket!
      currentBucket = newBucket(aPos);
      continue;
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
  }

  if (currentBucket) {
    buckets.push(currentBucket);
  }

  // Add an upper "navigation" bucket with offscreen-above anchors
  const above = {
    tags: aboveTags,
    position: vMargin,
  };

  // Add a lower "navigation" bucket with offscreen-below anchors
  const below = {
    tags: belowTags,
    position: containerRect.height - vMargin,
  };

  return {
    above,
    below,
    buckets,
  };
}
