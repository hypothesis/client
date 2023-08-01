import {
  intersectRects,
  rectCenter,
  rectContains,
  rectIntersects,
  rectsOverlapHorizontally,
  rectsOverlapVertically,
  rectIsEmpty,
  unionRects,
} from '../geometry';

function rectEquals(a, b) {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

describe('annotator/util/geometry', () => {
  describe('intersectRects', () => {
    it('returns the intersection of two rects', () => {
      const rect = intersectRects(
        new DOMRect(0, 0, 500, 500),
        new DOMRect(10, 10, 500, 500),
      );
      assert.isTrue(rectEquals(rect, new DOMRect(10, 10, 490, 490)));
    });
  });

  describe('rectIsEmpty', () => {
    it('returns true for null rects', () => {
      assert.isTrue(rectIsEmpty(new DOMRect()));
    });

    it('returns true for inverted rects', () => {
      assert.isTrue(rectIsEmpty(new DOMRect(10, 10, -10, -10)));
    });

    it('returns false for rects with positive width and height', () => {
      assert.isFalse(rectIsEmpty(new DOMRect(0, 0, 1, 1)));
    });
  });

  describe('rectIntersects', () => {
    it('returns false if either rect is empty', () => {
      assert.isFalse(rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect()));
      assert.isFalse(rectIntersects(new DOMRect(), new DOMRect(0, 0, 10, 10)));
    });

    it('returns false if rects do not intersect', () => {
      assert.isFalse(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(100, 0, 10, 10)),
      );
      assert.isFalse(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(0, 100, 10, 10)),
      );
    });

    it('returns false if rects touch but do not intersect', () => {
      assert.isFalse(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(10, 10, 10, 10)),
      );
    });

    it('returns true if rects intersect', () => {
      assert.isTrue(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(5, 5, 10, 10)),
      );
    });
  });

  describe('rectContains', () => {
    it('returns false if either rect is empty', () => {
      assert.isFalse(rectContains(new DOMRect(0, 0, 10, 10), new DOMRect()));
      assert.isFalse(rectContains(new DOMRect(), new DOMRect(0, 0, 10, 10)));
    });

    it('returns false if first rect does not fully contain second rect', () => {
      assert.isFalse(
        rectContains(new DOMRect(0, 0, 10, 10), new DOMRect(2, 2, 10, 10)),
      );
    });

    it('returns true if first rect contains second rect', () => {
      assert.isTrue(
        rectContains(new DOMRect(0, 0, 10, 10), new DOMRect(2, 2, 8, 8)),
      );
    });
  });

  describe('rectCenter', () => {
    it('returns a point at the center of the rect', () => {
      const point = rectCenter(new DOMRect(10, 10, 90, 90));
      assert.equal(point.x, 55);
      assert.equal(point.y, 55);
    });
  });

  describe('rectsOverlapVertically', () => {
    it('returns true if rects overlap', () => {
      assert.isTrue(
        rectsOverlapVertically(
          new DOMRect(0, 0, 10, 10),
          new DOMRect(100, 5, 10, 10),
        ),
      );
      assert.isFalse(
        rectsOverlapVertically(
          new DOMRect(0, 0, 10, 10),
          new DOMRect(100, 100, 10, 10),
        ),
      );
    });
  });

  describe('rectsOverlapHorizontally', () => {
    it('returns true if rects overlap', () => {
      assert.isTrue(
        rectsOverlapHorizontally(
          new DOMRect(0, 0, 10, 10),
          new DOMRect(5, 100, 10, 10),
        ),
      );
      assert.isFalse(
        rectsOverlapHorizontally(
          new DOMRect(0, 0, 10, 10),
          new DOMRect(100, 100, 10, 10),
        ),
      );
    });
  });

  describe('unionRects', () => {
    it('returns non-empty rect if one is empty', () => {
      const emptyRect = new DOMRect();
      const nonEmptyRect = new DOMRect(10, 10, 50, 50);

      assert.equal(unionRects(emptyRect, nonEmptyRect), nonEmptyRect);
      assert.equal(unionRects(nonEmptyRect, emptyRect), nonEmptyRect);
      assert.equal(unionRects(emptyRect, emptyRect), emptyRect);
    });

    it('returns union of both input rects', () => {
      const a = new DOMRect(5, 5, 10, 10);
      const b = new DOMRect(100, 100, 10, 10);

      const union = unionRects(a, b);

      assert.equal(union.left, 5);
      assert.equal(union.top, 5);
      assert.equal(union.right, 110);
      assert.equal(union.bottom, 110);
    });
  });
});
