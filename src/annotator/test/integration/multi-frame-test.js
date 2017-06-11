'use strict';

var proxyquire = require('proxyquire');
var isLoaded = require('../../util/frame-util.js').isLoaded;

describe('CrossFrame multi-frame scenario', function () {
  var fakeAnnotationSync;
  var fakeBridge;
  var proxyAnnotationSync;
  var proxyBridge;
  var container;
  var crossFrame;
  var options;

  var sandbox = sinon.sandbox.create();

  beforeEach(function () {
    fakeBridge = {
      createChannel: sandbox.stub(),
      call: sandbox.stub(),
      destroy: sandbox.stub(),
    };
    fakeAnnotationSync = {};
    proxyAnnotationSync = sandbox.stub().returns(fakeAnnotationSync);
    proxyBridge = sandbox.stub().returns(fakeBridge);

    var CrossFrame = proxyquire('../../plugin/cross-frame', {
      '../annotation-sync': proxyAnnotationSync,
      '../../shared/bridge': proxyBridge,
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    options = {
      enableMultiFrameSupport: true,
      embedScriptUrl: 'data:,', // empty data uri
      on: sandbox.stub(),
      emit: sandbox.stub(),
    };

    crossFrame = new CrossFrame(container, options);
  });

  afterEach(function () {
    sandbox.restore();
    crossFrame.destroy();
    container.parentNode.removeChild(container);
  });

  it('detects frames on page', function () {
    // Create a frame before initializing
    var validFrame = document.createElement('iframe');
    container.appendChild(validFrame);

    // Create another that mimics the sidebar frame
    // This one should should not be detected
    var invalidFrame = document.createElement('iframe');
    invalidFrame.className = 'h-sidebar-iframe';
    container.appendChild(invalidFrame);

    // Now initialize
    crossFrame.pluginInit();

    var validFramePromise = new Promise(function (resolve) {
      isLoaded(validFrame, function () {
        assert(validFrame.contentDocument.body.hasChildNodes(),
          'expected valid frame to be modified');
        resolve();
      });
    });
    var invalidFramePromise = new Promise(function (resolve) {
      isLoaded(invalidFrame, function () {
        assert(!invalidFrame.contentDocument.body.hasChildNodes(),
          'expected invalid frame to not be modified');
        resolve();
      });
    });

    return Promise.all([validFramePromise, invalidFramePromise]);
  });

  it('detects removed frames', function () {
    // Create a frame before initializing
    var frame = document.createElement('iframe');
    container.appendChild(frame);

    // Now initialize
    crossFrame.pluginInit();

    // Remove the frame
    frame.remove();

    assert.calledWith(fakeBridge.call, 'destroyFrame');
  });

  it('injects embed script in frame', function () {
    var frame = document.createElement('iframe');
    container.appendChild(frame);

    crossFrame.pluginInit();

    return new Promise(function (resolve) {
      isLoaded(frame, function () {
        var scriptElement = frame.contentDocument.querySelector('script[src]');
        assert(scriptElement, 'expected embed script to be injected');
        assert.equal(scriptElement.src, options.embedScriptUrl,
          'unexpected embed script source');
        resolve();
      });
    });
  });

  it('excludes injection from already injected frames', function () {
    var frame = document.createElement('iframe');
    frame.srcdoc = '<script>window.__hypothesis_frame = true;</script>';
    container.appendChild(frame);

    crossFrame.pluginInit();

    return new Promise(function (resolve) {
      isLoaded(frame, function () {
        var scriptElement = frame.contentDocument.querySelector('script[src]');
        assert(!scriptElement, 'expected embed script to not be injected');
        resolve();
      });
    });
  });

  it('detects dynamically added frames', function () {
    // Initialize with no initial frame, unlike before
    crossFrame.pluginInit();

    // Add a frame to the DOM
    var frame = document.createElement('iframe');
    container.appendChild(frame);

    return new Promise(function (resolve) {
      // Yield to let the DOM and CrossFrame catch up
      setTimeout(function () {
        isLoaded(frame, function () {
          assert(frame.contentDocument.body.hasChildNodes(),
            'expected dynamically added frame to be modified');
          resolve();
        });
      }, 0);
    });
  });

  it('detects dynamically removed frames', function () {
    // Create a frame before initializing
    var frame = document.createElement('iframe');
    container.appendChild(frame);

    // Now initialize
    crossFrame.pluginInit();

    return new Promise(function (resolve) {
      // Yield to let the DOM and CrossFrame catch up
      setTimeout(function () {
        frame.remove();

        // Yield again
        setTimeout(function () {
          assert.calledWith(fakeBridge.call, 'destroyFrame');
          resolve();
        }, 0);
      }, 0);
    });
  });

});