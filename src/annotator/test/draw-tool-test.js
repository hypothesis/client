import { delay } from '@hypothesis/frontend-testing';

import { DrawError, DrawTool } from '../draw-tool';

describe('DrawTool', () => {
  let container;
  let tool;

  beforeEach(() => {
    container = document.createElement('div');
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

  const sendMouseEvent = (event, x = 0, y = 0) => {
    getSurface().dispatchEvent(
      new MouseEvent(event, { clientX: x, clientY: y }),
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
    sendMouseEvent('mousedown');
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
    assert.notOk(getSurface());
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
    assert.notOk(getSurface());
  });

  describe('drawing a point', () => {
    it('finishes drawing when mouse is pressed', async () => {
      const shapePromise = tool.draw('point');
      sendMouseEvent('mousedown');

      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'point',
        x: 0,
        y: 0,
      });
    });

    it('ignores mousemove and mouseup events while drawing a point', async () => {
      const shapePromise = tool.draw('point');

      sendMouseEvent('mouseup');
      sendMouseEvent('mousemove');
      sendMouseEvent('mousedown', 20, 30);

      const shape = await shapePromise;
      assert.deepEqual(shape, {
        type: 'point',
        x: 20,
        y: 30,
      });
    });
  });

  describe('drawing a rect', () => {
    it('finishes drawing when mouse is released', async () => {
      const shapePromise = tool.draw('rect');
      sendMouseEvent('mousedown');
      sendMouseEvent('mousemove', 5, 5);
      sendMouseEvent('mouseup', 10, 20);

      const shape = await shapePromise;

      assert.deepEqual(shape, {
        type: 'rect',
        left: 0,
        top: 0,
        right: 10,
        bottom: 20,
      });
    });

    it('ignores "mousemove" and "mouseup" events before an initial "mousedown"', async () => {
      const shapePromise = tool.draw('rect');
      sendMouseEvent('mousemove', 5, 5);
      sendMouseEvent('mouseup', 10, 20);

      sendMouseEvent('mousedown');
      sendMouseEvent('mousemove', 3, 3);
      sendMouseEvent('mouseup', 6, 7);
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
});
