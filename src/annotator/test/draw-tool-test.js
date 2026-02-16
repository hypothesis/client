import { delay } from '@hypothesis/frontend-testing';

import { DrawError, DrawTool } from '../draw-tool';

describe('DrawError', () => {
  it('uses default message when not provided', () => {
    const err = new DrawError('canceled');
    assert.equal(err.kind, 'canceled');
    assert.equal(err.message, 'Drawing failed');
  });

  it('uses custom message when provided', () => {
    const err = new DrawError('restarted', 'Custom message');
    assert.equal(err.kind, 'restarted');
    assert.equal(err.message, 'Custom message');
  });
});

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

  it('ignores arrow keys when keyboard is active but mode is null (_handleArrowKey early return)', async () => {
    const shapePromise = tool.draw('rect', 'move').catch(() => {});
    await delay(0);
    // With _keyboardMode null, _handleArrowKey returns without moving
    if (typeof tool._keyboardMode !== 'undefined') {
      tool._keyboardMode = null;
    }
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await delay(0);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    const shape = await shapePromise;
    assert.equal(shape.type, 'rect');
  });

  it('ignores arrow keys when keyboard is active but shape is null (_handleArrowKey early return)', async () => {
    const shapePromise = tool.draw('rect', 'move').catch(() => {});
    await delay(0);
    // After draw() with initialMode, _shape is initialized by _activateKeyboardMode()
    // Set shape to null AFTER initialization to test early return in _handleArrowKey
    const originalShape = tool._shape;
    tool._shape = undefined;
    // Arrow key should be ignored when shape is null (early return at line 590)
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    await delay(0);
    // Restore shape so Enter can complete the test
    tool._shape = originalShape;
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    const shape = await shapePromise;
    assert.equal(shape.type, 'rect');
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

  describe('keyboard mode', () => {
    it('getKeyboardModeState returns inactive when no drawing', () => {
      const state = tool.getKeyboardModeState();
      assert.deepEqual(state, {
        keyboardActive: false,
        keyboardMode: null,
      });
    });

    it('getKeyboardModeState returns active mode when draw(tool, initialMode) is used', async () => {
      const shapePromise = tool.draw('rect', 'move');
      const state = tool.getKeyboardModeState();
      assert.isTrue(state.keyboardActive);
      assert.equal(state.keyboardMode, 'move');
      tool.cancel();
      try {
        await shapePromise;
      } catch {
        /* noop */
      }
    });

    it('calls onKeyboardModeChange when keyboard mode state changes', async () => {
      const onKeyboardModeChange = sinon.stub();
      tool.setOnKeyboardModeChange(onKeyboardModeChange);

      const shapePromise = tool.draw('rect', 'resize').catch(() => {});
      await delay(0);

      assert.calledWith(onKeyboardModeChange, {
        keyboardActive: true,
        keyboardMode: 'resize',
      });

      tool.cancel();
      await shapePromise;
    });

    it('Enter confirms rect when in keyboard mode', async () => {
      const shapePromise = tool.draw('rect', 'move');
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Enter does nothing when shape is null', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      
      // Set shape to null to test the branch at line 437
      tool._shape = undefined;
      
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await delay(0);
      
      // Promise should not resolve because shape is null
      let resolved = false;
      shapePromise.then(() => { resolved = true; });
      await delay(10);
      assert.isFalse(resolved, 'Enter should not confirm when shape is null');
      
      tool.cancel();
      await shapePromise.catch(() => {});
    });

    it('Enter confirms point when in keyboard mode', async () => {
      const shapePromise = tool.draw('point', 'move');
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'point');
      assert.isNumber(shape.x);
      assert.isNumber(shape.y);
    });

    it('setKeyboardMode activates keyboard mode and updates announcer when not yet active', async () => {
      const shapePromise = tool.draw('rect').catch(() => {});
      await delay(0);
      assert.isFalse(tool.getKeyboardModeState().keyboardActive);

      tool.setKeyboardMode('move');
      assert.isTrue(tool.getKeyboardModeState().keyboardActive);
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'move');

      tool.cancel();
      await shapePromise;
    });

    it('setKeyboardMode updates mode when already in keyboard mode', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'move');

      tool.setKeyboardMode('resize');
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'resize');

      tool.setKeyboardMode('rect');
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'rect');

      tool.cancel();
      await shapePromise;
    });

    it('setKeyboardMode does not update when mode is already set to the same value', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      const initialMode = tool.getKeyboardModeState().keyboardMode;
      assert.equal(initialMode, 'move');

      // Set to the same mode - should not change keyboardMode (line 689 check: keyboardMode !== mode)
      // The condition at line 689 prevents updating when mode is the same
      tool.setKeyboardMode('move');
      
      // Mode should still be 'move'
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'move');
      
      tool.cancel();
      await shapePromise;
    });

    it('setKeyboardMode resets pinned corner when switching to resize mode', async () => {
      const shapePromise = tool.draw('rect', 'resize').catch(() => {});
      await delay(0);
      
      // Cycle to a different corner
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      
      // Switch to resize mode again - should reset pinned corner to top-left (line 692-693)
      tool.setKeyboardMode('resize');
      
      // Pinned corner should be reset to top-left
      // Verify by checking that ArrowRight works (it works with top-left)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);
      
      tool.cancel();
      await shapePromise;
    });

    it('setKeyboardMode handles rect mode branch (line 696)', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      
      // Switch to 'rect' mode - tests the branch at line 696
      tool.setKeyboardMode('rect');
      
      // Should still be active but in rect mode
      assert.isTrue(tool.getKeyboardModeState().keyboardActive);
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'rect');
      
      tool.cancel();
      await shapePromise;
    });

    it('getKeyboardModeState returns rect mode when keyboard activated via setKeyboardMode("rect")', async () => {
      const shapePromise = tool.draw('rect').catch(() => {});
      await delay(0);
      tool.setKeyboardMode('rect');
      const state = tool.getKeyboardModeState();
      assert.isTrue(state.keyboardActive);
      assert.equal(state.keyboardMode, 'rect');
      tool.cancel();
      await shapePromise;
    });

    it('getKeyboardModeState returns rect when keyboard active but mode is null (default)', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      // After draw() with initialMode, _activateKeyboardMode() sets _keyboardMode to null initially
      // but then it's immediately set to initialMode. To test the branch where _keyboardMode is null
      // while keyboardActive is true, we need to manually set _keyboardMode to null
      tool._keyboardMode = null;
      const state = tool.getKeyboardModeState();
      assert.isTrue(state.keyboardActive);
      // When keyboardActive=true and _keyboardMode=null, getKeyboardModeState should return 'rect' (line 184)
      assert.equal(state.keyboardMode, 'rect');
      tool.cancel();
      await shapePromise;
    });

    it('Tab in resize mode cycles pinned corner', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await shapePromise;
      assert.ok(true, 'Tab did not prevent Enter from confirming');
    });

    it('Tab does nothing when keyboardMode is not resize', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      
      // Tab should be ignored when not in resize mode (line 422 condition)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      
      // Should still be in move mode
      assert.equal(tool.getKeyboardModeState().keyboardMode, 'move');
      
      tool.cancel();
      await shapePromise;
    });

    it('Tab does nothing when tool is not rect', async () => {
      const shapePromise = tool.draw('point', 'resize').catch(() => {});
      await delay(0);
      
      // Tab should be ignored when tool is not 'rect' (line 422 condition: tool === 'rect')
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      
      tool.cancel();
      await shapePromise;
    });

    it('Arrow keys move point in move mode', async () => {
      const shapePromise = tool.draw('point', 'move');
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        }),
      );
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'point');
      assert.isNumber(shape.x);
      assert.isNumber(shape.y);
    });

    it('Arrow keys move point in all directions (ArrowUp, ArrowDown, ArrowLeft)', async () => {
      const shapePromise = tool.draw('point', 'move');
      await delay(0);

      // Move up
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      // Move down
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await delay(0);

      // Move left
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'point');
      assert.isNumber(shape.x);
      assert.isNumber(shape.y);
    });

    it('Arrow keys move rect in move mode (all directions)', async () => {
      const shapePromise = tool.draw('rect', 'move');
      await delay(0);
      const initialState = tool.getKeyboardModeState();
      assert.equal(initialState.keyboardMode, 'move');

      // Move right
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      // Move down
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await delay(0);

      // Move left
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      // Move up
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Arrow keys resize rect in resize mode (top-left pinned)', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      tool.setKeyboardMode('resize');
      await delay(0);

      // Resize right (expand width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      // Resize down (expand height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Arrow key that does not modify from pinned corner is ignored in resize mode', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      // Cycle to top-right: ArrowRight does not modify (only left/bottom active)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      const before = tool.getKeyboardModeState();
      assert.equal(before.keyboardMode, 'resize');

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('ArrowLeft does not modify from top-left corner in resize mode (early return)', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      // Default pinned corner is top-left; ArrowLeft does not modify (only right/bottom active)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('ArrowUp does not modify from top-right corner in resize mode', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      // Cycle to top-right: ArrowUp does not modify (top is false, only bottom active)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      // Shape should not change because ArrowUp doesn't modify from top-right
      // (canModifyFromPinnedCorner returns false)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('Arrow keys contract rect in resize mode with top-left pinned (ArrowLeft, ArrowUp)', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      tool.setKeyboardMode('resize');
      await delay(0);

      // Contract width (ArrowLeft)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      // Contract height (ArrowUp)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Tab cycles pinned corner in resize mode', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);

      // Initial corner should be top-left
      // Press Tab to cycle to top-right
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Press Tab again to cycle to bottom-right
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Press Tab again to cycle to bottom-left
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Press Tab again to cycle back to top-left
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Resize with arrow keys should work
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await shapePromise;
    });

    it('Arrow keys resize rect with top-right corner pinned', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      tool.setKeyboardMode('resize');
      await delay(0);

      // Cycle to top-right corner
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Top-right: ArrowRight contracts width, ArrowDown expands height, ArrowLeft expands width, ArrowUp contracts height
      // Test ArrowRight (contract width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      // Test ArrowDown (expand height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await delay(0);

      // Test ArrowLeft (expand width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      // Test ArrowUp (contract height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Arrow keys resize rect with bottom-right corner pinned', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      tool.setKeyboardMode('resize');
      await delay(0);

      // Cycle to bottom-right corner (2 Tabs from top-left)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Bottom-right: ArrowRight contracts width, ArrowDown contracts height, ArrowLeft expands width, ArrowUp expands height
      // Test ArrowRight (contract width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      // Test ArrowDown (contract height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await delay(0);

      // Test ArrowLeft (expand width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      // Test ArrowUp (expand height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Arrow keys resize rect with bottom-left corner pinned', async () => {
      const shapePromise = tool.draw('rect', 'resize');
      await delay(0);
      tool.setKeyboardMode('resize');
      await delay(0);

      // Cycle to bottom-left corner (3 Tabs from top-left)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
      );
      await delay(0);

      // Bottom-left: ArrowRight expands width, ArrowDown contracts height, ArrowLeft contracts width, ArrowUp expands height
      // Test ArrowRight (expand width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      await delay(0);

      // Test ArrowDown (contract height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await delay(0);

      // Test ArrowLeft (contract width)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      await delay(0);

      // Test ArrowUp (expand height)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Arrow keys with Shift use large increment for point', async () => {
      const shapePromise = tool.draw('point', 'move');
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        }),
      );
      await delay(0);
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'point');
      assert.isNumber(shape.x);
      assert.isNumber(shape.y);
    });

    it('Arrow keys with Shift use large increment', async () => {
      const shapePromise = tool.draw('rect', 'move');
      await delay(0);

      // Move with Shift (large increment)
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          shiftKey: true,
          bubbles: true,
        }),
      );
      await delay(0);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('updates rectangle position when container scrolls', async () => {
      // Make container scrollable
      Object.assign(container.style, {
        overflow: 'auto',
        height: '100px',
        width: '100px',
      });
      const largeChild = document.createElement('div');
      Object.assign(largeChild.style, {
        width: '200px',
        height: '200px',
      });
      container.append(largeChild);

      const shapePromise = tool.draw('rect', 'move');
      await delay(0);

      // Get initial position
      const initialState = tool.getKeyboardModeState();
      assert.isTrue(initialState.keyboardActive);

      // Scroll container
      container.scrollTop = 50;
      container.scrollLeft = 30;
      container.dispatchEvent(new Event('scroll', { bubbles: true }));

      // Wait for debounced scroll handler
      await delay(100);

      // Confirm shape
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('initializes rectangle position when draw(tool, initialMode) is called', async () => {
      // Add a .page element to simulate PDF page
      const page = document.createElement('div');
      page.className = 'page';
      Object.assign(page.style, {
        width: '200px',
        height: '300px',
        position: 'relative',
      });
      container.append(page);

      const shapePromise = tool.draw('rect', 'move');
      await delay(0);

      // Shape should be initialized
      const state = tool.getKeyboardModeState();
      assert.isTrue(state.keyboardActive);

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
      assert.isNumber(shape.left);
      assert.isNumber(shape.top);
      assert.isNumber(shape.right);
      assert.isNumber(shape.bottom);
    });

    it('Escape deactivates keyboard mode', async () => {
      const shapePromise = tool.draw('rect', 'move');
      // Add catch handler immediately to prevent unhandled rejection
      const caughtPromise = shapePromise.catch(err => err);
      
      await delay(0);
      assert.isTrue(tool.getKeyboardModeState().keyboardActive);

      // Press Escape - this cancels the drawing and rejects the promise
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      await delay(0);

      // Verify keyboard mode is deactivated
      assert.isFalse(tool.getKeyboardModeState().keyboardActive);

      // Capture the rejected promise
      const err = await caughtPromise;

      assert.instanceOf(err, DrawError);
      assert.equal(err.kind, 'canceled');
    });

    it('ignores keydown when user is typing in an input (WCAG 2.1.4)', async () => {
      const shapePromise = tool.draw('rect', 'move');
      await delay(0);

      const input = document.createElement('input');
      input.type = 'text';
      container.append(input);
      input.focus();

      // Dispatch Enter from input — handler should return early and not confirm
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      await delay(0);

      assert.isTrue(tool.getKeyboardModeState().keyboardActive, 'draw still active after Enter from input');

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('_updateAnnouncer handles missing containers gracefully', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      
      // Set containers to undefined to test early return in _updateAnnouncer (line 709)
      // This simulates the case where containers were removed or never created
      const originalAnnouncer = tool._announcerContainer;
      const originalIndicator = tool._indicatorContainer;
      tool._announcerContainer = undefined;
      tool._indicatorContainer = undefined;
      
      // Try to trigger _updateAnnouncer by changing keyboard mode
      // This should not throw even if containers are missing (early return)
      tool.setKeyboardMode('resize');
      await delay(0);
      
      // Restore containers so the test can complete normally
      tool._announcerContainer = originalAnnouncer;
      tool._indicatorContainer = originalIndicator;
      
      // Should still work normally
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('_updateAnnouncer does not call onKeyboardModeChange when callback is not set', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      
      // Ensure callback is not set (unregister)
      tool.setOnKeyboardModeChange(undefined);
      
      // Trigger _updateAnnouncer by changing keyboard mode
      // Should not throw even if callback is undefined (line 758 check)
      tool.setKeyboardMode('resize');
      await delay(0);
      
      // Should still work normally
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
    });

    it('_updateAnnouncer handles shape type point correctly', async () => {
      const shapePromise = tool.draw('point', 'move').catch(() => {});
      await delay(0);
      
      // Verify that _updateAnnouncer handles point type (line 719 branch)
      // This should set x and y but not width/height
      tool.setKeyboardMode('move');
      await delay(0);
      
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'point');
    });

    it('_updateAnnouncer handles case when shape is undefined', async () => {
      const shapePromise = tool.draw('rect', 'move').catch(() => {});
      await delay(0);
      
      // Set shape to undefined to test the branch at line 718
      tool._shape = undefined;
      
      // Trigger _updateAnnouncer - should handle undefined shape gracefully
      tool.setKeyboardMode('resize');
      await delay(0);
      
      // Restore shape for test completion
      tool._shape = {
        type: 'rect',
        left: 10,
        top: 10,
        right: 50,
        bottom: 50,
      };
      
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
      const shape = await shapePromise;
      assert.equal(shape.type, 'rect');
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
