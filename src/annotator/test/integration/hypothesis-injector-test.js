import { DEBOUNCE_WAIT, onDocumentReady } from '../../frame-observer';
import { HypothesisInjector } from '../../hypothesis-injector';

describe('HypothesisInjector integration test', () => {
  let container;
  let fakeBridge;
  let hypothesisInjectors;

  const sandbox = sinon.createSandbox();
  const config = {
    clientUrl: 'data:,', // empty data uri
  };

  const waitForFrameObserver = () =>
    new Promise(resolve => setTimeout(resolve, DEBOUNCE_WAIT + 10));

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

  it('detects frames on page', async () => {
    const validFrame = createAnnotatableIFrame();
    // Create another that mimics the sidebar frame
    // This one should should not be detected
    const invalidFrame = createAnnotatableIFrame('dummy-attribute');

    // Now initialize
    createHypothesisInjector();

    await onDocumentReady(validFrame);
    assert(
      validFrame.contentDocument.body.hasChildNodes(),
      'expected valid frame to be modified'
    );

    await onDocumentReady(invalidFrame);
    assert(
      !invalidFrame.contentDocument.body.hasChildNodes(),
      'expected invalid frame to not be modified'
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

    const scriptElement = frame.contentDocument.querySelector('script[src]');
    assert(scriptElement, 'expected embed script to be injected');
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
      frame.contentDocument.querySelector('script[src]'),
      'expected embed script to not be injected'
    );
  });

  it('detects dynamically added frames', async () => {
    // Initialize with no initial frame, unlike before
    createHypothesisInjector();

    // Add a frame to the DOM
    const frame = createAnnotatableIFrame();

    await waitForFrameObserver();
    await onDocumentReady(frame);
    assert.isTrue(
      frame.contentDocument.body.hasChildNodes(),
      'expected dynamically added frame to be modified'
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

    assert.isTrue(
      frame.contentDocument.body.hasChildNodes(),
      'expected initial frame to be modified'
    );

    frame.remove();
    await waitForFrameObserver();

    container.appendChild(frame);
    assert.isFalse(frame.contentDocument.body.hasChildNodes());

    await waitForFrameObserver();
    await onDocumentReady(frame);

    assert(
      frame.contentDocument.body.hasChildNodes(),
      'expected dynamically added frame to be modified'
    );
  });

  it('detects a frame dynamically added, removed, and added again', async () => {
    // Initialize with no initial frame
    createHypothesisInjector();

    // Add a frame to the DOM
    const frame = createAnnotatableIFrame();

    await waitForFrameObserver();
    await onDocumentReady(frame);

    assert.isTrue(
      frame.contentDocument.body.hasChildNodes(),
      'expected dynamically added frame to be modified'
    );

    frame.remove();
    await waitForFrameObserver();

    container.appendChild(frame);
    assert.isFalse(frame.contentDocument.body.hasChildNodes());

    await waitForFrameObserver();
    await onDocumentReady(frame);

    assert.isTrue(
      frame.contentDocument.body.hasChildNodes(),
      'expected dynamically added frame to be modified'
    );
  });
});
