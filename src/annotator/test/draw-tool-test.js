import { delay } from '@hypothesis/frontend-testing';

import { DrawError, DrawTool } from '../draw-tool';

describe('DrawTool', () => {
  let container;
  let tool;

  beforeEach(() => {
    container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100px',
      height: '100px',
    });
    document.body.append(container);
    tool = new DrawTool(container);
  });

  afterEach(() => {
    tool.cancel();
    container.remove();
  });

  // Return the SVG surface created to display the incomplete shape while
  // drawing.
  const getSurface = () => container.querySelector('svg[data-testid=surface]');

  const sendPointerEvent = (event, x = 0, y = 0) => {
    getSurface().dispatchEvent(
      new PointerEvent(event, { clientX: x, clientY: y }),
    );
  };

  it('creates SVG when drawing starts', async () => {
    tool.draw('rect').catch(() => {
      /* ignored */
    });
    assert.ok(getSurface());
  });

  it('removes SVG when drawing ends', async () => {
    const shape = tool.draw('point');
    sendPointerEvent('pointerdown');
    sendPointerEvent('pointerup');
    await shape;
    assert.notOk(getSurface());
  });

  it('cancels drawing if `cancel` is called', async () => {
    const shape = tool.draw('point');

    tool.cancel();

    let err;
    try {
      await shape;
    } catch (e) {
      err = e;
    }

    assert.instanceOf(err, DrawError);
    assert.notOk(getSurface());
  });

  it('cancels drawing if DrawTool is destroyed', async () => {
    const shape = tool.draw('point');
    tool.destroy();

    let err;
    try {
      await shape;
    } catch (e) {
      err = e;
    }

    assert.instanceOf(err, DrawError);
    assert.equal(err.kind, 'canceled');
    assert.notOk(getSurface());
  });

  it('cancels drawing if a new drawing is started', async () => {
    const shape = tool.draw('rect');
    const newShape = tool.draw('point');
    newShape.catch(() => {
      // Ignore error
    });

    let err;
    try {
      await shape;
    } catch (e) {
      err = e;
    }

    assert.instanceOf(err, DrawError);
    assert.equal(err.kind, 'restarted');
  });

  it('cancels drawing if `Escape` is pressed', async () => {
    let done = false;
    const shape = tool.draw('point').then(() => (done = true));

    // Keys other than Escape should be ignored.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await delay(0);
    assert.isFalse(done);

    // Escape key should cancel drawing
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape' }),
    );

    let err;
    try {
      await shape;
    } catch (e) {
      err = e;
    }

    assert.instanceOf(err, DrawError);
    assert.equal(err.kind, 'canceled');
    assert.notOk(getSurface());
  });

  describe('drawing a point', () => {
    it('finishes drawing when mouse is released', async () => {
      const shapePromise = tool.draw('point');
      sendPointerEvent('pointerdown', 5, 5);
      sendPointerEvent('pointermove', 10, 10);
      sendPointerEvent('pointerup', 15, 20);

      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'point',
        x: 15,
        y: 20,
      });
    });
  });

  describe('drawing a rect', () => {
    it('finishes drawing when mouse is released after dragging', async () => {
      const shapePromise = tool.draw('rect');
      sendPointerEvent('pointerdown');
      sendPointerEvent('pointermove', 5, 5);
      sendPointerEvent('pointerup', 10, 20);

      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'rect',
        left: 0,
        top: 0,
        right: 10,
        bottom: 20,
      });
    });

    it('allows creating rectangle with two clicks (WCAG 2.5.7)', async () => {
      const shapePromise = tool.draw('rect');
      // First click: no significant movement
      sendPointerEvent('pointerdown', 10, 10);
      sendPointerEvent('pointerup', 10, 10); // Same position, no drag

      // Surface should still be visible, waiting for second click
      assert.ok(getSurface());

      // Second click completes the rectangle
      sendPointerEvent('pointerdown', 50, 60);
      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'rect',
        left: 10,
        top: 10,
        right: 50,
        bottom: 60,
      });
    });

    it('shows visual indicator after first click in two-click mode', async () => {
      const shapePromise = tool.draw('rect');
      // First click: no significant movement
      sendPointerEvent('pointerdown', 10, 10);
      sendPointerEvent('pointerup', 10, 10);

      // Check that surface is still visible with indicator
      const surface = getSurface();
      assert.ok(surface);

      // Should have a circle and crosshair lines (indicator elements)
      const circle = surface.querySelector('circle');
      const lines = surface.querySelectorAll('line');
      assert.ok(circle, 'Should show circle indicator');
      assert.equal(lines.length, 2, 'Should show crosshair lines');

      tool.cancel();
      try {
        await shapePromise;
      } catch {
        /* noop */
      }
    });

    it('can cancel drawing with Escape while waiting for second click', async () => {
      const shapePromise = tool.draw('rect');
      // First click: no significant movement
      sendPointerEvent('pointerdown', 10, 10);
      sendPointerEvent('pointerup', 10, 10);

      // Press Escape to cancel
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape' }),
      );

      let err;
      try {
        await shapePromise;
      } catch (e) {
        err = e;
      }

      assert.instanceOf(err, DrawError);
      assert.equal(err.kind, 'canceled');
      assert.notOk(getSurface());
    });

    it('ignores pointerup events while waiting for second click', async () => {
      const shapePromise = tool.draw('rect');
      // First click: no significant movement
      sendPointerEvent('pointerdown', 10, 10);
      sendPointerEvent('pointerup', 10, 10);

      // Surface should still be visible, waiting for second click
      assert.ok(getSurface());

      // Send additional pointerup events - these should be ignored
      sendPointerEvent('pointerup', 20, 20);
      sendPointerEvent('pointerup', 30, 30);

      // Drawing should still be in progress (not completed)
      let shapeResolved = false;
      shapePromise.then(() => {
        shapeResolved = true;
      });
      await delay(0);
      assert.isFalse(shapeResolved, 'Drawing should not be completed yet');
      assert.ok(getSurface(), 'Surface should still be visible');

      // Second click completes the rectangle
      sendPointerEvent('pointerdown', 50, 60);
      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'rect',
        left: 10,
        top: 10,
        right: 50,
        bottom: 60,
      });
    });

    it('ignores "pointermove" and "pointerup" events before an initial "pointerdown"', async () => {
      const shapePromise = tool.draw('rect');
      sendPointerEvent('pointermove', 5, 5);
      sendPointerEvent('pointerup', 10, 20);

      sendPointerEvent('pointerdown');
      sendPointerEvent('pointermove', 3, 3);
      sendPointerEvent('pointerup', 6, 7);
      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'rect',
        left: 0,
        top: 0,
        right: 6,
        bottom: 7,
      });
    });
  });

  it('scrolls elements underneath drawing surface when "wheel" events are received', async () => {
    // Add scrollable container that can scroll in both X and Y directions.
    const scrollable = document.createElement('div');
    Object.assign(scrollable.style, {
      height: '100px',
      width: '100px',
      overflow: 'scroll',
    });
    const child = document.createElement('div');
    Object.assign(child.style, {
      width: '200px',
      height: '200px',
    });
    scrollable.append(child);
    container.append(scrollable);

    const shapePromise = tool.draw('rect');

    // Simulate user scrolling the drawing surface with a wheel or touchpad.
    const event = new WheelEvent('wheel', {
      clientX: 5,
      clientY: 5,
      deltaY: 10,
      deltaX: 20,
    });
    getSurface().dispatchEvent(event);

    // Check the scroll was transferred to the element underneath.
    assert.equal(scrollable.scrollLeft, event.deltaX);
    assert.equal(scrollable.scrollTop, event.deltaY);

    tool.cancel();
    try {
      await shapePromise;
    } catch {
      /* noop */
    }
  });
});
