import { DEBOUNCE_WAIT, onDocumentReady } from '../../frame-observer';
import { HypothesisInjector } from '../../hypothesis-injector';

describe('HypothesisInjector integration test', () => {
  let container;
  let fakeBridge;
  let hypothesisInjectors;

  const sandbox = sinon.createSandbox();
  const config = {
    clientUrl: 'data:,Hypothesis', // empty data uri
  };

  function waitForFrameObserver() {
    return new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT + 10));
  }

  function getHypothesisScript(iframe) {
    return iframe.contentDocument.querySelector(
      'script[src="data:,Hypothesis"]'
    );
  }

  function createHypothesisInjector() {
    const hypothesisInjector = new HypothesisInjector(
      container,
      fakeBridge,
      config
    );
    hypothesisInjectors.push(hypothesisInjector);
    return hypothesisInjector;
  }

  function createAnnotatableIFrame(attribute = 'enable-annotation') {
    const frame = document.createElement('iframe');
    frame.setAttribute(attribute, '');
    container.appendChild(frame);
    return frame;
  }

  beforeEach(() => {
    fakeBridge = {
      createChannel: sandbox.stub(),
      call: sandbox.stub(),
      destroy: sandbox.stub(),
    };
    hypothesisInjectors = [];

    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    sandbox.restore();
    hypothesisInjectors.forEach(injector => injector.destroy());
    container.remove();
  });

  it('detects frames on page', async () => {
    const validFrame = createAnnotatableIFrame();
    // Create another that mimics the sidebar frame
    // This one should should not be detected
    const invalidFrame = createAnnotatableIFrame('dummy-attribute');

    // Now initialize
    createHypothesisInjector();

    await onDocumentReady(validFrame);
    assert.isNotNull(
      getHypothesisScript(validFrame),
      'expected valid frame to include the Hypothesis script'
    );

    await onDocumentReady(invalidFrame);
    assert.isNull(
      getHypothesisScript(invalidFrame),
      'expected invalid frame to not include the Hypothesis script'
    );
  });

  it('detects removed frames', async () => {
    // Create a frame before initializing
    const frame = createAnnotatableIFrame();

    // Now initialize
    createHypothesisInjector();
    await onDocumentReady(frame);

    // Remove the frame
    frame.remove();
    await waitForFrameObserver();

    assert.calledWith(fakeBridge.call, 'destroyFrame');
  });

  it('injects embed script in frame', async () => {
    const frame = createAnnotatableIFrame();

    createHypothesisInjector();
    await onDocumentReady(frame);

    const scriptElement = getHypothesisScript(frame);
    assert.isNotNull(
      scriptElement,
      'expected the frame to include the Hypothesis script'
    );
    assert.equal(
      scriptElement.src,
      config.clientUrl,
      'unexpected embed script source'
    );
  });

  it('excludes injection from already injected frames', async () => {
    const frame = createAnnotatableIFrame();
    frame.contentWindow.eval('window.__hypothesis = {}');

    createHypothesisInjector();
    await onDocumentReady(frame);

    assert.isNull(
      getHypothesisScript(frame),
      'expected frame to not include the Hypothesis script'
    );
  });

  it('detects dynamically added frames', async () => {
    // Initialize with no initial frame, unlike before
    createHypothesisInjector();

    // Add a frame to the DOM
    const frame = createAnnotatableIFrame();

    await waitForFrameObserver();
    await onDocumentReady(frame);
    assert.isNotNull(
      getHypothesisScript(frame),
      'expected dynamically added frame to include the Hypothesis script'
    );
  });

  it('detects dynamically removed frames', async () => {
    // Create a frame before initializing
    const frame = createAnnotatableIFrame();

    // Now initialize
    createHypothesisInjector();
    await waitForFrameObserver();
    await onDocumentReady(frame);

    frame.remove();
    await waitForFrameObserver();

    assert.calledWith(fakeBridge.call, 'destroyFrame');
  });

  it('detects a frame dynamically removed, and added again', async () => {
    const frame = createAnnotatableIFrame();

    // Now initialize
    createHypothesisInjector();
    await onDocumentReady(frame);

    assert.isNotNull(
      getHypothesisScript(frame),
      'expected initial frame to include the Hypothesis script'
    );

    frame.remove();
    await waitForFrameObserver();

    container.appendChild(frame);
    assert.isNull(getHypothesisScript(frame));

    await waitForFrameObserver();
    await onDocumentReady(frame);

    assert.isNotNull(
      getHypothesisScript(frame),
      'expected dynamically added frame to include the Hypothesis script'
    );
  });

  it('detects a frame dynamically added, removed, and added again', async () => {
    // Initialize with no initial frame
    createHypothesisInjector();

    // Add a frame to the DOM
    const frame = createAnnotatableIFrame();

    await waitForFrameObserver();
    await onDocumentReady(frame);

    assert.isNotNull(
      getHypothesisScript(frame),
      'expected dynamically added frame to include the Hypothesis script'
    );

    frame.remove();
    await waitForFrameObserver();

    container.appendChild(frame);
    assert.isNull(getHypothesisScript(frame));

    await waitForFrameObserver();
    await onDocumentReady(frame);

    assert.isNotNull(
      getHypothesisScript(frame),
      'expected dynamically added frame to include the Hypothesis script'
    );
  });
});
