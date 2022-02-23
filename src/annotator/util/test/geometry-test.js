import {
  intersectRects,
  rectContains,
  rectIntersects,
  rectIsEmpty,
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
        new DOMRect(10, 10, 500, 500)
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
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(100, 0, 10, 10))
      );
      assert.isFalse(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(0, 100, 10, 10))
      );
    });

    it('returns false if rects touch but do not intersect', () => {
      assert.isFalse(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(10, 10, 10, 10))
      );
    });

    it('returns true if rects intersect', () => {
      assert.isTrue(
        rectIntersects(new DOMRect(0, 0, 10, 10), new DOMRect(5, 5, 10, 10))
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
        rectContains(new DOMRect(0, 0, 10, 10), new DOMRect(2, 2, 10, 10))
      );
    });

    it('returns true if first rect contains second rect', () => {
      assert.isTrue(
        rectContains(new DOMRect(0, 0, 10, 10), new DOMRect(2, 2, 8, 8))
      );
    });
  });
});
