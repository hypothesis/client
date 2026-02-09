import { SelectionObserver } from '../selection-observer';

describe('SelectionObserver', () => {
  let clock;
  let frame;
  let observer;
  let onSelectionChanged;
  let testDocument;

  function getSelectedRange() {
    return testDocument.getSelection().getRangeAt(0);
  }

  beforeAll(() => {
    frame = document.createElement('iframe');
    document.body.append(frame);
    testDocument = frame.contentDocument;
    testDocument.body.innerHTML = 'Some test content';

    testDocument.getSelection().selectAllChildren(testDocument.body);
    assert.isNotNull(getSelectedRange());
  });

  afterAll(() => {
    frame.remove();
  });

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    onSelectionChanged = sinon.stub();

    observer = new SelectionObserver(onSelectionChanged, testDocument);

    // Move the clock forwards past the initial event.
    clock.tick(10);
    onSelectionChanged.reset();
  });

  afterEach(() => {
    observer.disconnect();
    clock.restore();
  });

  it('invokes callback when mouseup occurs', () => {
    testDocument.body.dispatchEvent(new Event('mouseup'));
    clock.tick(20);
    assert.calledWith(onSelectionChanged, getSelectedRange());
  });

  it('invokes callback with initial selection', () => {
    const onInitialSelection = sinon.stub();
    const observer = new SelectionObserver(onInitialSelection, testDocument);
    clock.tick(10);
    assert.called(onInitialSelection);
    observer.disconnect();
  });

  describe('when the selection changes', () => {
    it('invokes callback if mouse is not down', () => {
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(200);
      assert.calledWith(onSelectionChanged, getSelectedRange());
    });

    it('does not invoke callback if mouse is down', () => {
      testDocument.body.dispatchEvent(new Event('mousedown'));
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(200);
      assert.notCalled(onSelectionChanged);
    });

    it('does not invoke callback until there is a pause since the last change', () => {
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(90);
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(90);
      assert.notCalled(onSelectionChanged);
      clock.tick(20);
      assert.called(onSelectionChanged);
    });

    it('uses longer delay for selectionchange (keyboard) than for mouseup', () => {
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(50);
      assert.notCalled(onSelectionChanged);
      clock.tick(60);
      assert.calledWith(onSelectionChanged, getSelectedRange());
    });

    it('handles multiple rapid selectionchange events correctly', () => {
      // Dispatch multiple selectionchange events rapidly
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(50);
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(50);
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(50);
      // Should not have called yet
      assert.notCalled(onSelectionChanged);
      // After the delay period, should call once
      clock.tick(60);
      assert.calledOnce(onSelectionChanged);
    });

    it('cancels pending callback when new event arrives', () => {
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(50);
      // Dispatch another event before the first callback fires
      testDocument.dispatchEvent(new Event('selectionchange'));
      clock.tick(50);
      // Should not have called yet (callback was cancelled and rescheduled)
      assert.notCalled(onSelectionChanged);
      // After the delay period, should call once
      clock.tick(60);
      assert.calledOnce(onSelectionChanged);
    });
  });
});
