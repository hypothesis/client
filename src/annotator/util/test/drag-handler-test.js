import { delay } from '@hypothesis/frontend-testing';

import { DragHandler } from '../drag-handler';

describe('DragHandler', () => {
  let handler;
  let target;
  let threshold;
  let onDrag;

  beforeEach(() => {
    target = document.createElement('button');
    document.body.append(target);

    threshold = 10;

    onDrag = sinon.stub();
    handler = new DragHandler({ target, onDrag, threshold });
  });

  afterEach(() => {
    handler.destroy();
    target.remove();
  });

  const firePointerDown = (clientX = 0) => {
    target.dispatchEvent(
      new PointerEvent('pointerdown', { clientX, bubbles: true }),
    );
  };

  // Pointer move and up events are dispatched at the body, but they could be
  // dispatched at any element in the window.

  const firePointerMove = clientX => {
    document.body.dispatchEvent(
      new PointerEvent('pointermove', { clientX, bubbles: true }),
    );
  };

  const firePointerUp = () => {
    document.body.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true }),
    );
  };

  const beginDrag = distance => {
    firePointerDown();
    firePointerMove(distance);
  };

  it('disables browser pan gestures on the target', () => {
    assert.equal(target.style.touchAction, 'none');
  });

  it('fires "dragstart" when target is pressed and moved by at least `threshold` pixels', () => {
    firePointerDown();
    assert.notCalled(onDrag);

    firePointerMove(threshold + 5);
    assert.calledWith(onDrag, { type: 'dragstart', deltaX: threshold + 5 });
  });

  ['pointercancel', 'pointerup'].forEach(eventType => {
    it('fires "dragend" when pointer is released', () => {
      beginDrag(threshold + 5);
      document.body.dispatchEvent(
        new PointerEvent(eventType, { bubbles: true }),
      );
      assert.calledWith(onDrag, { type: 'dragend', deltaX: 0 });
    });
  });

  it('fires "dragmove" when pointer moves while a drag is active', () => {
    beginDrag(threshold + 5);
    onDrag.resetHistory();
    firePointerMove(20);
    assert.calledWith(onDrag, { type: 'dragmove', deltaX: 20 });
  });

  it('suppresses "click" events that immediately follow a drag end', async () => {
    beginDrag(threshold + 5);
    firePointerUp();

    let clickCount = 0;
    const btn = document.createElement('button');
    document.body.append(btn);

    try {
      // Simulate click on button, as if drag end finished with the pointer on
      // that element. This should be suppressed.
      btn.onclick = () => (clickCount += 1);
      const click = new MouseEvent('click', { bubbles: true });
      btn.dispatchEvent(click);

      await delay(0);
      assert.equal(clickCount, 0);

      // Simulate a later click after the suppression period has ended. This
      // should not be suppressed.
      const click2 = new MouseEvent('click', { bubbles: true });
      btn.dispatchEvent(click2);

      assert.equal(clickCount, 1);
    } finally {
      btn.remove();
    }
  });

  it('does not fire "dragmove" or "dragend" if a drag is not active', () => {
    firePointerUp();
    firePointerMove(10);
    assert.notCalled(onDrag);
  });
});
