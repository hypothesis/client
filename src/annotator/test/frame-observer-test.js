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
  const sandbox = sinon.createSandbox();

  function waitForFrameObserver() {
    return new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT + 10));
  }

  function createAnnotatableIFrame(
    attribute = 'enable-annotation',
    value = ''
  ) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute(attribute, value);
    container.appendChild(iframe);
    return iframe;
  }

  function waitForIFrameUnload(iframe) {
    return new Promise(resolve =>
      iframe.contentWindow.addEventListener('unload', resolve)
    );
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    onFrameAdded = sandbox.stub();
    onFrameRemoved = sandbox.stub();
    frameObserver = new FrameObserver(container, onFrameAdded, onFrameRemoved);
    sandbox.stub(console, 'warn');
  });

  afterEach(() => {
    container.remove();
    frameObserver.disconnect();
    sandbox.restore();
  });

  it('triggers onFrameAdded when an annotatable iframe is added', async () => {
    let iframe = createAnnotatableIFrame();
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, iframe);

    iframe = createAnnotatableIFrame('enable-annotation', 'yes');
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, iframe);

    iframe = createAnnotatableIFrame('enable-annotation', 'true');
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, iframe);

    iframe = createAnnotatableIFrame('enable-annotation', '1');
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, iframe);

    iframe = createAnnotatableIFrame('enable-annotation', 'false'); // the actual value of the attribute is irrelevant
    await waitForFrameObserver();

    assert.calledWith(onFrameAdded, iframe);
  });

  it("doesn't trigger onFrameAdded when non-annotatable iframes are added", async () => {
    createAnnotatableIFrame('dummy-attribute');
    await waitForFrameObserver();

    assert.notCalled(onFrameAdded);
  });

  it('removal of the annotatable iframe triggers onFrameRemoved', async () => {
    const iframe = createAnnotatableIFrame();

    await waitForFrameObserver();
    assert.calledOnce(onFrameAdded);
    assert.calledWith(onFrameAdded, iframe);

    iframe.remove();

    await waitForFrameObserver();
    assert.calledOnce(onFrameRemoved);
    assert.calledWith(onFrameRemoved, iframe);
  });

  it('removal of the `enable-annotation` attribute triggers onFrameRemoved', async () => {
    const iframe = createAnnotatableIFrame();
    await waitForFrameObserver();

    assert.calledOnce(onFrameAdded);
    assert.calledWith(onFrameAdded, iframe);

    iframe.removeAttribute('enable-annotation');
    await waitForFrameObserver();

    assert.calledOnce(onFrameRemoved);
    assert.calledWith(onFrameRemoved, iframe);
  });

  it('changing the `src` attribute triggers onFrameRemoved', async () => {
    const iframe = createAnnotatableIFrame();
    await waitForFrameObserver();

    assert.calledOnce(onFrameAdded);
    assert.calledWith(onFrameAdded, iframe);

    iframe.setAttribute('src', document.location);
    await waitForIFrameUnload(iframe);

    assert.calledOnce(onFrameRemoved);
    assert.calledWith(onFrameRemoved, iframe);
  });

  it(`doesn't call onFrameAdded if FrameObserver is disconnected`, async () => {
    frameObserver.disconnect();
    const iframe = createAnnotatableIFrame();

    frameObserver._discoverFrames(); // Emulate a race condition
    await onDocumentReady(iframe);

    assert.notCalled(onFrameAdded);
  });

  it("doesn't trigger onFrameAdded when annotatable iframe is from a different domain", async () => {
    const iframe = createAnnotatableIFrame();
    iframe.setAttribute('src', 'http://cross-origin.dummy');

    await onDocumentReady(iframe);
    await waitForFrameObserver();
    assert.notCalled(onFrameAdded);
    assert.calledOnce(console.warn);
  });
});
