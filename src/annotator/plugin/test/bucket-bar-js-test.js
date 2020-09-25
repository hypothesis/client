import { findClosestOffscreenAnchor } from '../bucket-bar-js';
import { $imports } from '../bucket-bar-js';

function fakeAnchorFactory() {
  let highlightIndex = 0;
  return () => {
    // This incrementing array-item value allows for differing
    // `top` results; see fakeGetBoundingClientRect
    return { highlights: [highlightIndex++] };
  };
}

describe('annotator/plugin/bucket-bar', () => {
  let fakeGetBoundingClientRect;

  beforeEach(() => {
    fakeGetBoundingClientRect = sinon.stub().callsFake(highlights => {
      // Return a `top` value based on the first item in the array
      const top = highlights[0] * 100 + 1;
      return {
        top,
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
});
