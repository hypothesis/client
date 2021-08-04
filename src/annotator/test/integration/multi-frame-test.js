import { DEBOUNCE_WAIT } from '../../frame-observer';
import { CrossFrame, $imports } from '../../cross-frame';
import { isLoaded } from '../../util/frame-util';

describe('CrossFrame multi-frame scenario', () => {
  let fakeAnnotationSync;
  let fakeBridge;
  let proxyAnnotationSync;
  let proxyBridge;
  let container;
  let crossFrame;
  let config;

  const sandbox = sinon.createSandbox();

  const waitForFrameObserver = function (cb) {
    const wait = DEBOUNCE_WAIT + 10;
    return setTimeout(cb, wait);
  };

  beforeEach(() => {
    fakeBridge = {
      createChannel: sandbox.stub(),
      call: sandbox.stub(),
      destroy: sandbox.stub(),
    };
    fakeAnnotationSync = { destroy: sandbox.stub() };
    proxyAnnotationSync = sandbox.stub().returns(fakeAnnotationSync);
    proxyBridge = sandbox.stub().returns(fakeBridge);

    $imports.$mock({
      './annotation-sync': { AnnotationSync: proxyAnnotationSync },
      '../shared/bridge': proxyBridge,
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    config = {
      clientUrl: 'data:,', // empty data uri
    };

    crossFrame = null;
  });

  afterEach(() => {
    sandbox.restore();
    crossFrame.destroy();
    container.parentNode.removeChild(container);

    $imports.$restore();
  });

  function createCrossFrame() {
    const eventBus = {};
    return new CrossFrame(container, eventBus, config);
  }

  it('detects frames on page', () => {
    // Create a frame before initializing
    const validFrame = document.createElement('iframe');
    validFrame.setAttribute('enable-annotation', '');
    container.appendChild(validFrame);

    // Create another that mimics the sidebar frame
    // This one should should not be detected
    const invalidFrame = document.createElement('iframe');
    invalidFrame.className = 'h-sidebar-iframe';
    container.appendChild(invalidFrame);

    // Now initialize
    crossFrame = createCrossFrame();

    const validFramePromise = new Promise(resolve => {
      isLoaded(validFrame, () => {
        assert(
          validFrame.contentDocument.body.hasChildNodes(),
          'expected valid frame to be modified'
        );
        resolve();
      });
    });
    const invalidFramePromise = new Promise(resolve => {
      isLoaded(invalidFrame, () => {
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
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    // Now initialize
    crossFrame = createCrossFrame();

    // Remove the frame
    frame.remove();

    assert.calledWith(fakeBridge.call, 'destroyFrame');
  });

  it('injects embed script in frame', () => {
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    crossFrame = createCrossFrame();

    return new Promise(resolve => {
      isLoaded(frame, () => {
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

    crossFrame = createCrossFrame();

    return new Promise(resolve => {
      isLoaded(frame, () => {
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
    crossFrame = createCrossFrame();

    // Add a frame to the DOM
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    return new Promise(resolve => {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(() => {
        isLoaded(frame, () => {
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
    crossFrame = createCrossFrame();

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
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    // Now initialize
    crossFrame = createCrossFrame();

    return new Promise(resolve => {
      isLoaded(frame, () => {
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
            isLoaded(frame, () => {
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
    crossFrame = createCrossFrame();

    // Add a frame to the DOM
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    return new Promise(resolve => {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(() => {
        isLoaded(frame, () => {
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
              isLoaded(frame, () => {
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
