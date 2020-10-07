import {
  findClosestOffscreenAnchor,
  constructPositionPoints,
  buildBuckets,
} from '../buckets';
import { $imports } from '../buckets';

function fakeAnchorFactory() {
  let highlightIndex = 0;
  return () => {
    // This incrementing array-item value allows for differing
    // `top` results; see fakeGetBoundingClientRect
    return { highlights: [highlightIndex++] };
  };
}

describe('annotator/util/buckets', () => {
  let fakeGetBoundingClientRect;

  beforeEach(() => {
    fakeGetBoundingClientRect = sinon.stub().callsFake(highlights => {
      // Return a `top` value based on the first item in the array
      const top = highlights[0] * 100 + 1;
      return {
        top,
        bottom: top + 50,
      };
    });

    $imports.$mock({
      '../highlighter': {
        getBoundingClientRect: fakeGetBoundingClientRect,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('findClosestOffscreenAnchor', () => {
    let fakeAnchors;
    let stubbedInnerHeight;

    beforeEach(() => {
      const fakeAnchor = fakeAnchorFactory();
      fakeAnchors = [
        fakeAnchor(), // top: 1
        fakeAnchor(), // top: 101
        fakeAnchor(), // top: 201
        fakeAnchor(), // top: 301
        fakeAnchor(), // top: 401
        fakeAnchor(), // top: 501
      ];
      stubbedInnerHeight = sinon.stub(window, 'innerHeight').value(410);
    });

    afterEach(() => {
      stubbedInnerHeight.restore();
    });

    it('finds the closest anchor above screen when headed up', () => {
      // fakeAnchors [0] and [1] are offscreen upwards, having `top` values
      // < BUCKET_TOP_THRESHOLD. [1] is closer so wins out. [3] and [4] are
      // "onscreen" already, or below where we want to go, anyway.
      assert.equal(
        findClosestOffscreenAnchor(fakeAnchors, 'up'),
        fakeAnchors[1]
      );
    });

    it('finds the closest anchor below screen when headed down', () => {
      // Our faked window.innerHeight here is 410, but the fake anchor with
      // top: 400 qualifies because it falls within BUCKET_NAV_SIZE of
      // the bottom of the window. It's closer to the screen than the last
      // anchor.
      assert.equal(
        findClosestOffscreenAnchor(fakeAnchors, 'down'),
        fakeAnchors[4]
      );
    });

    it('finds the right answer regardless of anchor order', () => {
      assert.equal(
        findClosestOffscreenAnchor(
          [fakeAnchors[3], fakeAnchors[1], fakeAnchors[4], fakeAnchors[0]],
          'up'
        ),
        fakeAnchors[1]
      );

      assert.equal(
        findClosestOffscreenAnchor(
          [fakeAnchors[4], fakeAnchors[2], fakeAnchors[3]],
          'down'
        ),
        fakeAnchors[4]
      );
    });

    it('ignores anchors with no highlights', () => {
      fakeAnchors.push({ highlights: [] });
      findClosestOffscreenAnchor(fakeAnchors, 'down');
      // It will disregard the anchor without the highlights and not try to
      // assess its boundingRect
      assert.equal(fakeGetBoundingClientRect.callCount, fakeAnchors.length - 1);
    });

    it('returns null if no valid anchor found', () => {
      stubbedInnerHeight = sinon.stub(window, 'innerHeight').value(800);
      assert.isNull(findClosestOffscreenAnchor([{ highlights: [] }], 'down'));
      assert.isNull(findClosestOffscreenAnchor(fakeAnchors, 'down'));
    });
  });

  describe('constructPositionPoints', () => {
    let fakeAnchors;
    let stubbedInnerHeight;

    beforeEach(() => {
      const fakeAnchor = fakeAnchorFactory();
      fakeAnchors = [
        fakeAnchor(), // top: 1
        fakeAnchor(), // top: 101
        fakeAnchor(), // top: 201
        fakeAnchor(), // top: 301
        fakeAnchor(), // top: 401
        fakeAnchor(), // top: 501
      ];
      stubbedInnerHeight = sinon.stub(window, 'innerHeight').value(410);
    });

    afterEach(() => {
      stubbedInnerHeight.restore();
    });

    it('returns an Array of anchors that are offscreen above', () => {
      const positionPoints = constructPositionPoints(fakeAnchors);

      assert.deepEqual(positionPoints.above, [fakeAnchors[0], fakeAnchors[1]]);
    });

    it('returns an Array of anchors that are offscreen below', () => {
      const positionPoints = constructPositionPoints(fakeAnchors);

      assert.deepEqual(positionPoints.below, [fakeAnchors[4], fakeAnchors[5]]);
    });

    it('does not return duplicate anchors', () => {
      const positionPoints = constructPositionPoints([
        fakeAnchors[0],
        fakeAnchors[0],
        fakeAnchors[5],
        fakeAnchors[5],
      ]);

      assert.deepEqual(positionPoints.above, [fakeAnchors[0]]);
      assert.deepEqual(positionPoints.below, [fakeAnchors[5]]);
    });

    it('returns an Array of position points for on-screen anchors', () => {
      const positionPoints = constructPositionPoints(fakeAnchors);

      // It should return two "point" positions for each on-screen anchor,
      // one representing the top of the anchor's highlight box, one representing
      // the bottom position
      assert.equal(positionPoints.points.length, 4);
      // The top position of the first on-screen anchor
      assert.deepEqual(positionPoints.points[0], [201, 1, fakeAnchors[2]]);
      // The bottom position of the first on-screen anchor
      assert.deepEqual(positionPoints.points[1], [251, -1, fakeAnchors[2]]);
      // The top position of the second on-screen anchor
      assert.deepEqual(positionPoints.points[2], [301, 1, fakeAnchors[3]]);
      // The bottom position of the second on-screen anchor
      assert.deepEqual(positionPoints.points[3], [351, -1, fakeAnchors[3]]);
    });

    it('sorts on-screen points based on position primarily, type secondarily', () => {
      fakeGetBoundingClientRect.callsFake(() => {
        return {
          top: 250,
          bottom: 250,
        };
      });
      const positionPoints = constructPositionPoints(fakeAnchors);
      for (let i = 0; i < fakeAnchors.length; i++) {
        // The bottom position for all of the fake anchors is the same, so
        // those points will all be at the top of the list
        assert.equal(positionPoints.points[i][2], fakeAnchors[i]);
        // This point is a "bottom" point
        assert.equal(positionPoints.points[i][1], -1);
        // The top position for all of the fake anchors is the same, so
        // they'll be sorted to the end of the list
        assert.equal(
          positionPoints.points[i + fakeAnchors.length][2],
          fakeAnchors[i]
        );
        // This point is a "top" point
        assert.equal(positionPoints.points[i + fakeAnchors.length][1], 1);
      }
    });
  });

  describe('buildBuckets', () => {
    it('should return empty buckets if points array is empty', () => {
      const buckets = buildBuckets([]);
      assert.isArray(buckets);
      assert.isEmpty(buckets);
    });

    it('should group overlapping anchor highlights into shared buckets', () => {
      const anchors = [{}, {}, {}, {}];
      const points = [];
      // Represents points for 4 anchors that all have a top of 150px and bottom
      // of 200
      anchors.forEach(anchor => {
        points.push([150, 1, anchor]);
        points.push([200, -1, anchor]);
      });

      const buckets = buildBuckets(points);
      assert.equal(buckets.length, 2);
      assert.isEmpty(buckets[1].anchors);
      // All anchors are in a single bucket
      assert.deepEqual(buckets[0].anchors, anchors);
      // Because this is the first bucket, it will be aligned top
      assert.equal(buckets[0].position, 150);
    });

    it('should group nearby anchor highlights into shared buckets', () => {
      let increment = 25;
      const anchors = [{}, {}, {}, {}];
      const points = [];
      // Represents points for 4 anchors that all have different start and
      // end positions, but only differing by 25px
      anchors.forEach(anchor => {
        points.push([150 + increment, 1, anchor]);
        points.push([200 + increment, -1, anchor]);
        increment += 25;
      });

      const buckets = buildBuckets(points);
      assert.equal(buckets.length, 2);
      assert.isEmpty(buckets[1].anchors);
      // All anchors are in a single bucket
      assert.deepEqual(buckets[0].anchors, anchors);
      // Because this is the first bucket, it will be aligned top
      assert.equal(buckets[0].position, 175);
    });

    it('should put anchors that are not near each other in separate buckets', () => {
      let position = 100;
      const anchors = [{}, {}, {}, {}];
      const points = [];
      // Represents points for 4 anchors that all have different start and
      // end positions, but only differing by 25px
      anchors.forEach(anchor => {
        points.push([position, 1, anchor]);
        points.push([position + 20, -1, anchor]);
        position += 100;
      });
      const buckets = buildBuckets(points);
      assert.equal(buckets.length, 8);
      // Legacy of previous implementation, shrug?
      assert.isEmpty(buckets[1].anchors);
      assert.isEmpty(buckets[3].anchors);
      assert.isEmpty(buckets[5].anchors);
      assert.isEmpty(buckets[7].anchors);
      assert.deepEqual(buckets[0].anchors, [anchors[0]]);
      assert.deepEqual(buckets[2].anchors, [anchors[1]]);
      assert.deepEqual(buckets[4].anchors, [anchors[2]]);
      assert.deepEqual(buckets[6].anchors, [anchors[3]]);
    });
  });
});
