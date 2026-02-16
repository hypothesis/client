import {
  applyMoveArrowKeyToPoint,
  applyMoveArrowKeyToRect,
} from '../rect-move';

describe('annotator/util/rect-move', () => {
  const viewport = {
    minLeft: 0,
    minTop: 10,
    maxRight: 200,
    maxBottom: 150,
  };

  describe('applyMoveArrowKeyToPoint', () => {
    it('moves point with arrow keys, clamped to bounds', () => {
      const point = { type: 'point', x: 50, y: 50 };
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowUp', 10, viewport),
        { type: 'point', x: 50, y: 40 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowDown', 10, viewport),
        { type: 'point', x: 50, y: 60 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowLeft', 10, viewport),
        { type: 'point', x: 40, y: 50 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowRight', 10, viewport),
        { type: 'point', x: 60, y: 50 },
      );
    });

    it('clamps to viewport bounds', () => {
      const point = { type: 'point', x: 195, y: 145 };
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowRight', 10, viewport),
        { type: 'point', x: 200, y: 145 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowDown', 10, viewport),
        { type: 'point', x: 195, y: 150 },
      );
    });

    it('respects minTop when moving up', () => {
      const point = { type: 'point', x: 50, y: 15 };
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'ArrowUp', 10, viewport),
        { type: 'point', x: 50, y: 10 },
      );
    });

    it('does not mutate input', () => {
      const point = { type: 'point', x: 50, y: 50 };
      applyMoveArrowKeyToPoint(point, 'ArrowRight', 10, viewport);
      assert.equal(point.x, 50);
    });

    it('returns same point for unknown key (default branch)', () => {
      const point = { type: 'point', x: 50, y: 50 };
      assert.deepEqual(
        applyMoveArrowKeyToPoint(point, 'UnknownKey', 10, viewport),
        point,
      );
    });
  });

  describe('applyMoveArrowKeyToRect', () => {
    const rect = {
      type: 'rect',
      left: 50,
      top: 20,
      right: 120,
      bottom: 80,
    };

    it('moves rect with arrow keys', () => {
      assert.deepEqual(
        applyMoveArrowKeyToRect(rect, 'ArrowUp', 10, viewport),
        { type: 'rect', left: 50, top: 10, right: 120, bottom: 70 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToRect(rect, 'ArrowDown', 10, viewport),
        { type: 'rect', left: 50, top: 30, right: 120, bottom: 90 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToRect(rect, 'ArrowLeft', 10, viewport),
        { type: 'rect', left: 40, top: 20, right: 110, bottom: 80 },
      );
      assert.deepEqual(
        applyMoveArrowKeyToRect(rect, 'ArrowRight', 10, viewport),
        { type: 'rect', left: 60, top: 20, right: 130, bottom: 80 },
      );
    });

    it('does not mutate input', () => {
      const r = { ...rect };
      applyMoveArrowKeyToRect(r, 'ArrowRight', 10, viewport);
      assert.equal(r.left, 50);
    });

    it('returns same rect for unknown key (default branch)', () => {
      assert.deepEqual(
        applyMoveArrowKeyToRect(rect, 'UnknownKey', 10, viewport),
        rect,
      );
    });
  });
});
