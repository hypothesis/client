import {
  clampRectToViewport,
  computeInitialShapePosition,
  getViewportBounds,
} from '../draw-tool-position';

describe('annotator/util/draw-tool-position', () => {
  describe('getViewportBounds', () => {
    it('returns bounds from container scroll and client size', () => {
      const container = document.createElement('div');
      // In test envs (jsdom/happy-dom) scrollLeft/scrollTop may be read-only, so define them
      Object.defineProperty(container, 'scrollLeft', {
        value: 10,
        configurable: true,
      });
      Object.defineProperty(container, 'scrollTop', {
        value: 20,
        configurable: true,
      });
      Object.defineProperty(container, 'clientWidth', { value: 100 });
      Object.defineProperty(container, 'clientHeight', { value: 80 });
      sinon.stub(container, 'getBoundingClientRect').returns({
        top: 0,
        left: 0,
      });

      const bounds = getViewportBounds(container, 40);
      assert.equal(bounds.minLeft, 10);
      assert.equal(bounds.minTop, 60);
      assert.equal(bounds.maxRight, 110);
      assert.equal(bounds.maxBottom, 100);
    });
  });

  describe('clampRectToViewport', () => {
    it('clamps rect to viewport', () => {
      const rect = {
        type: 'rect',
        left: -10,
        top: 5,
        right: 90,
        bottom: 50,
      };
      const viewport = {
        minLeft: 0,
        minTop: 10,
        maxRight: 100,
        maxBottom: 80,
      };
      const r = clampRectToViewport(rect, viewport);
      assert.equal(r.left, 0);
      assert.equal(r.top, 10);
      assert.equal(r.right, 100);
      assert.equal(r.bottom, 55);
    });

    it('does not mutate input', () => {
      const rect = { type: 'rect', left: 10, top: 10, right: 50, bottom: 40 };
      clampRectToViewport(rect, { minLeft: 0, minTop: 0, maxRight: 100, maxBottom: 100 });
      assert.equal(rect.left, 10);
    });
  });

  describe('computeInitialShapePosition', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      container.scrollLeft = 0;
      container.scrollTop = 0;
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    const options = {
      defaultRectangleSize: 30,
      reservedViewportTop: 40,
    };

    it('returns point at offset when tool is point and no existing shape', () => {
      const shape = computeInitialShapePosition(
        container,
        undefined,
        'point',
        options,
      );
      assert.equal(shape.type, 'point');
      assert.isNumber(shape.x);
      assert.isNumber(shape.y);
    });

    it('returns default rect when tool is rect and no existing shape', () => {
      const shape = computeInitialShapePosition(
        container,
        undefined,
        'rect',
        options,
      );
      assert.equal(shape.type, 'rect');
      assert.equal(shape.right - shape.left, 30);
      assert.equal(shape.bottom - shape.top, 30);
    });

    it('preserves rect size when existing shape is rect', () => {
      const existing = {
        type: 'rect',
        left: 0,
        top: 0,
        right: 100,
        bottom: 60,
      };
      const shape = computeInitialShapePosition(
        container,
        existing,
        'rect',
        options,
      );
      assert.equal(shape.type, 'rect');
      assert.equal(shape.right - shape.left, 100);
      assert.equal(shape.bottom - shape.top, 60);
    });

    it('uses visible area of first .page when present (bestPage branch)', () => {
      const pageEl = document.createElement('div');
      pageEl.className = 'page';
      container.appendChild(pageEl);
      Object.defineProperty(container, 'scrollLeft', {
        value: 0,
        configurable: true,
      });
      Object.defineProperty(container, 'scrollTop', {
        value: 0,
        configurable: true,
      });
      // Container viewport: (0,0) to (200,150); page overlaps and has visible area
      const containerRect = { top: 0, left: 0, bottom: 150, right: 200 };
      const pageRect = { top: 10, left: 20, bottom: 100, right: 180 };
      sinon.stub(container, 'getBoundingClientRect').returns(containerRect);
      sinon.stub(pageEl, 'getBoundingClientRect').returns(pageRect);

      const shape = computeInitialShapePosition(
        container,
        undefined,
        'rect',
        options,
      );

      assert.equal(shape.type, 'rect');
      // startX = visibleLeft - containerRect.left + scrollLeft + 10 = 20 + 10 = 30
      assert.equal(shape.left, 30);
      // startY = visibleTop - containerRect.top + scrollTop + 10 = 10 + 10 = 20 (reservedViewportTop 40: visibleTop = max(10, 0, 40) = 40, so startY = 40 + 10 = 50)
      assert.equal(shape.top, 50);
    });
  });
});
