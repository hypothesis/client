import {
  FrameObserver,
  DEBOUNCE_WAIT,
  onDocumentReady,
} from '../frame-observer';

describe('FrameObserver', () => {
  let container;
  let frameObserver;
  let onFrameAdded;
  let onFrameRemoved;

  function waitForFrameObserver() {
    return new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT + 10));
  }

  function createAnnotatableIFrame(
    attribute = 'enable-annotation',
    value = ''
  ) {
    const frame = document.createElement('iframe');
    frame.setAttribute(attribute, value);
    container.appendChild(frame);
    return frame;
  }

  function waitForIFrameUnload(frame) {
    return new Promise(resolve =>
      frame.contentWindow.addEventListener('unload', resolve)
    );
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onFrameAdded = sinon.stub();
    onFrameRemoved = sinon.stub();
    frameObserver = new FrameObserver(container, onFrameAdded, onFrameRemoved);
  });

  afterEach(() => {
    container.remove();
    frameObserver.disconnect();
  });

  it('triggers onFrameAdded when an annotatable iframe is added', async () => {
    let frame = createAnnotatableIFrame();
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, frame);

    frame = createAnnotatableIFrame('enable-annotation', 'yes');
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, frame);

    frame = createAnnotatableIFrame('enable-annotation', 'true');
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, frame);

    frame = createAnnotatableIFrame('enable-annotation', '1');
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, frame);

    frame = createAnnotatableIFrame('enable-annotation', 'false'); // the actual value of the attribute is irrelevant
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, frame);
  });

  it("doesn't trigger onFrameAdded when non-annotatable iframes are added", async () => {
    createAnnotatableIFrame('dummy-attribute');
    await waitForFrameObserver();

    assert.notCalled(onFrameAdded);
  });

  it('removal of the annotatable iframe triggers onFrameRemoved', done => {
    sinon.stub(frameObserver, '_removeFrame').callThrough();
    const frame = createAnnotatableIFrame();

    waitForFrameObserver()
      .then(() => {
        assert.calledOnce(onFrameAdded);
        assert.calledWith(onFrameAdded, frame);
      })
      .then(() => {
        frame.remove();
      });

    waitForIFrameUnload(frame)
      .then(() => waitForFrameObserver())
      .then(() => {
        assert.calledOnce(frameObserver._removeFrame);
        assert.calledOnce(onFrameRemoved);
        assert.calledWith(onFrameRemoved, frame);
      })
      .then(done);
  });

  it('removal of the `enable-annotation` attribute triggers onFrameRemoved', async () => {
    const frame = createAnnotatableIFrame();
    await waitForFrameObserver();

    assert.calledOnce(onFrameAdded);
    assert.calledWith(onFrameAdded, frame);

    frame.removeAttribute('enable-annotation');
    await waitForFrameObserver();

    assert.calledOnce(onFrameRemoved);
    assert.calledWith(onFrameRemoved, frame);
  });

  it('changing the `src` attribute triggers onFrameRemoved', async () => {
    const frame = createAnnotatableIFrame();
    await waitForFrameObserver();

    assert.calledOnce(onFrameAdded);
    assert.calledWith(onFrameAdded, frame);

    frame.setAttribute('src', document.location);
    await waitForIFrameUnload(frame);

    assert.calledOnce(onFrameRemoved);
    assert.calledWith(onFrameRemoved, frame);
  });

  it(`doesn't call onFrameAdded if FrameObserver is disconnected`, async () => {
    frameObserver.disconnect();
    const frame = createAnnotatableIFrame();

    frameObserver._discoverFrames(); // Emulate a race condition
    await onDocumentReady(frame);

    assert.notCalled(onFrameAdded);
  });

  // This test doesn't work. Surprisingly, `isAccessible` returns `true` even
  // thought the iframe is from a different domain. My suspicion is that the
  // iframe is accessed at a time where the loading has not yet started and it
  // is therefore accessible.
  // it("doesn't triggers onFrameAdded when annotatable iframe is from a different domain", async () => {
  //   const frame = createAnnotatableIFrame('src', 'https://example.com');
  //   frame.setAttribute('enable-annotation', '');
  //   await waitForFrameObserver();

  //   assert.notCalled(onFrameAdded);
  // });
});
