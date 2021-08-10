import { DEBOUNCE_WAIT } from '../../frame-observer';
import { HypothesisInjector } from '../../hypothesis-injector';
import { isDocumentReady } from '../../frame-observer';

describe('HypothesisInjector integration test', () => {
  let container;
  let fakeBridge;
  let hypothesisInjectors;

  const sandbox = sinon.createSandbox();
  const config = {
    clientUrl: 'data:,', // empty data uri
  };

  const waitForFrameObserver = cb => {
    const wait = DEBOUNCE_WAIT + 10;
    return setTimeout(cb, wait);
  };

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

  function createAnnotatableIFrame() {
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);
    return frame;
  }

  it('detects frames on page', () => {
    const validFrame = createAnnotatableIFrame();

    // Create another that mimics the sidebar frame
    // This one should should not be detected
    const invalidFrame = document.createElement('iframe');
    invalidFrame.className = 'h-sidebar-iframe';
    container.appendChild(invalidFrame);

    // Now initialize
    createHypothesisInjector();

    const validFramePromise = new Promise(resolve => {
      isDocumentReady(validFrame, () => {
        assert(
          validFrame.contentDocument.body.hasChildNodes(),
          'expected valid frame to be modified'
        );
        resolve();
      });
    });
    const invalidFramePromise = new Promise(resolve => {
      isDocumentReady(invalidFrame, () => {
        assert(
          !invalidFrame.contentDocument.body.hasChildNodes(),
          'expected invalid frame to not be modified'
        );
        resolve();
      });
    });

    return Promise.all([validFramePromise, invalidFramePromise]);
  });

  it('detects removed frames', () => {
    // Create a frame before initializing
    const frame = createAnnotatableIFrame();

    // Now initialize
    createHypothesisInjector();

    // Remove the frame
    frame.remove();

    assert.calledWith(fakeBridge.call, 'destroyFrame');
  });

  it('injects embed script in frame', () => {
    const frame = createAnnotatableIFrame();

    createHypothesisInjector();

    return new Promise(resolve => {
      isDocumentReady(frame, () => {
        const scriptElement =
          frame.contentDocument.querySelector('script[src]');
        assert(scriptElement, 'expected embed script to be injected');
        assert.equal(
          scriptElement.src,
          config.clientUrl,
          'unexpected embed script source'
        );
        resolve();
      });
    });
  });

  it('excludes injection from already injected frames', () => {
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);
    frame.contentWindow.eval('window.__hypothesis = {}');

    createHypothesisInjector();

    return new Promise(resolve => {
      isDocumentReady(frame, () => {
        const scriptElement =
          frame.contentDocument.querySelector('script[src]');
        assert.isNull(
          scriptElement,
          'expected embed script to not be injected'
        );
        resolve();
      });
    });
  });

  it('detects dynamically added frames', () => {
    // Initialize with no initial frame, unlike before
    createHypothesisInjector();

    // Add a frame to the DOM
    const frame = createAnnotatableIFrame();

    return new Promise(resolve => {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(() => {
        isDocumentReady(frame, () => {
          assert(
            frame.contentDocument.body.hasChildNodes(),
            'expected dynamically added frame to be modified'
          );
          resolve();
        });
      });
    });
  });

  it('detects dynamically removed frames', () => {
    // Create a frame before initializing
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    // Now initialize
    createHypothesisInjector();

    return new Promise(resolve => {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(() => {
        frame.remove();

        // Yield again
        waitForFrameObserver(() => {
          assert.calledWith(fakeBridge.call, 'destroyFrame');
          resolve();
        });
      });
    });
  });

  it('detects a frame dynamically removed, and added again', () => {
    // Create a frame before initializing
    const frame = createAnnotatableIFrame();

    // Now initialize
    createHypothesisInjector();

    return new Promise(resolve => {
      isDocumentReady(frame, () => {
        assert(
          frame.contentDocument.body.hasChildNodes(),
          'expected initial frame to be modified'
        );

        frame.remove();

        // Yield to let the DOM and CrossFrame catch up
        waitForFrameObserver(() => {
          // Add the frame again
          container.appendChild(frame);

          // Yield again
          waitForFrameObserver(() => {
            isDocumentReady(frame, () => {
              assert(
                frame.contentDocument.body.hasChildNodes(),
                'expected dynamically added frame to be modified'
              );
              resolve();
            });
          });
        });
      });
    });
  });

  it('detects a frame dynamically added, removed, and added again', () => {
    // Initialize with no initial frame
    createHypothesisInjector();

    // Add a frame to the DOM
    const frame = createAnnotatableIFrame();

    return new Promise(resolve => {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(() => {
        isDocumentReady(frame, () => {
          assert(
            frame.contentDocument.body.hasChildNodes(),
            'expected dynamically added frame to be modified'
          );

          frame.remove();

          // Yield again
          waitForFrameObserver(() => {
            // Add the frame again
            container.appendChild(frame);

            // Yield
            waitForFrameObserver(() => {
              isDocumentReady(frame, () => {
                assert(
                  frame.contentDocument.body.hasChildNodes(),
                  'expected dynamically added frame to be modified'
                );
                resolve();
              });
            });
          });
        });
      });
    });
  });
});
