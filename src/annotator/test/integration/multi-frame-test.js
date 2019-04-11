'use strict';

const isLoaded = require('../../util/frame-util').isLoaded;

const FRAME_DEBOUNCE_WAIT = require('../../frame-observer').DEBOUNCE_WAIT + 10;
const CrossFrame = require('../../plugin/cross-frame');

describe('CrossFrame multi-frame scenario', function() {
  let fakeAnnotationSync;
  let fakeBridge;
  let proxyAnnotationSync;
  let proxyBridge;
  let container;
  let crossFrame;
  let options;

  const sandbox = sinon.sandbox.create();

  const waitForFrameObserver = function(cb) {
    return setTimeout(cb, FRAME_DEBOUNCE_WAIT);
  };

  beforeEach(function() {
    fakeBridge = {
      createChannel: sandbox.stub(),
      call: sandbox.stub(),
      destroy: sandbox.stub(),
    };
    fakeAnnotationSync = {};
    proxyAnnotationSync = sandbox.stub().returns(fakeAnnotationSync);
    proxyBridge = sandbox.stub().returns(fakeBridge);

    CrossFrame.$imports.$mock({
      '../annotation-sync': proxyAnnotationSync,
      '../../shared/bridge': proxyBridge,
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    options = {
      config: {
        clientUrl: 'data:,', // empty data uri
      },
      on: sandbox.stub(),
      emit: sandbox.stub(),
    };

    crossFrame = new CrossFrame(container, options);
  });

  afterEach(function() {
    sandbox.restore();
    crossFrame.destroy();
    container.parentNode.removeChild(container);

    CrossFrame.$imports.$restore();
  });

  it('detects frames on page', function() {
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
    crossFrame.pluginInit();

    const validFramePromise = new Promise(function(resolve) {
      isLoaded(validFrame, function() {
        assert(
          validFrame.contentDocument.body.hasChildNodes(),
          'expected valid frame to be modified'
        );
        resolve();
      });
    });
    const invalidFramePromise = new Promise(function(resolve) {
      isLoaded(invalidFrame, function() {
        assert(
          !invalidFrame.contentDocument.body.hasChildNodes(),
          'expected invalid frame to not be modified'
        );
        resolve();
      });
    });

    return Promise.all([validFramePromise, invalidFramePromise]);
  });

  it('detects removed frames', function() {
    // Create a frame before initializing
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    // Now initialize
    crossFrame.pluginInit();

    // Remove the frame
    frame.remove();

    assert.calledWith(fakeBridge.call, 'destroyFrame');
  });

  it('injects embed script in frame', function() {
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    crossFrame.pluginInit();

    return new Promise(function(resolve) {
      isLoaded(frame, function() {
        const scriptElement = frame.contentDocument.querySelector(
          'script[src]'
        );
        assert(scriptElement, 'expected embed script to be injected');
        assert.equal(
          scriptElement.src,
          options.config.clientUrl,
          'unexpected embed script source'
        );
        resolve();
      });
    });
  });

  it('excludes injection from already injected frames', function() {
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);
    frame.contentWindow.eval('window.__hypothesis_frame = true');

    crossFrame.pluginInit();

    return new Promise(function(resolve) {
      isLoaded(frame, function() {
        const scriptElement = frame.contentDocument.querySelector(
          'script[src]'
        );
        assert.isNull(
          scriptElement,
          'expected embed script to not be injected'
        );
        resolve();
      });
    });
  });

  it('detects dynamically added frames', function() {
    // Initialize with no initial frame, unlike before
    crossFrame.pluginInit();

    // Add a frame to the DOM
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    return new Promise(function(resolve) {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(function() {
        isLoaded(frame, function() {
          assert(
            frame.contentDocument.body.hasChildNodes(),
            'expected dynamically added frame to be modified'
          );
          resolve();
        });
      });
    });
  });

  it('detects dynamically removed frames', function() {
    // Create a frame before initializing
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    // Now initialize
    crossFrame.pluginInit();

    return new Promise(function(resolve) {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(function() {
        frame.remove();

        // Yield again
        waitForFrameObserver(function() {
          assert.calledWith(fakeBridge.call, 'destroyFrame');
          resolve();
        });
      });
    });
  });

  it('detects a frame dynamically removed, and added again', function() {
    // Create a frame before initializing
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    // Now initialize
    crossFrame.pluginInit();

    return new Promise(function(resolve) {
      isLoaded(frame, function() {
        assert(
          frame.contentDocument.body.hasChildNodes(),
          'expected initial frame to be modified'
        );

        frame.remove();

        // Yield to let the DOM and CrossFrame catch up
        waitForFrameObserver(function() {
          // Add the frame again
          container.appendChild(frame);

          // Yield again
          waitForFrameObserver(function() {
            isLoaded(frame, function() {
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

  it('detects a frame dynamically added, removed, and added again', function() {
    // Initialize with no initial frame
    crossFrame.pluginInit();

    // Add a frame to the DOM
    const frame = document.createElement('iframe');
    frame.setAttribute('enable-annotation', '');
    container.appendChild(frame);

    return new Promise(function(resolve) {
      // Yield to let the DOM and CrossFrame catch up
      waitForFrameObserver(function() {
        isLoaded(frame, function() {
          assert(
            frame.contentDocument.body.hasChildNodes(),
            'expected dynamically added frame to be modified'
          );

          frame.remove();

          // Yield again
          waitForFrameObserver(function() {
            // Add the frame again
            container.appendChild(frame);

            // Yield
            waitForFrameObserver(function() {
              isLoaded(frame, function() {
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
