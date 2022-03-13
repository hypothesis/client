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

  before(() => {
    frame = document.createElement('iframe');
    document.body.append(frame);
    testDocument = frame.contentDocument;
    testDocument.body.innerHTML = 'Some test content';

    testDocument.getSelection().selectAllChildren(testDocument.body);
    assert.isNotNull(getSelectedRange());
  });

  after(() => {
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
  });
});
