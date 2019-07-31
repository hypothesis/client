'use strict';

const features = require('../features');
const events = require('../../events');
const bridgeEvents = require('../../../shared/bridge-events');

describe('h:features - sidebar layer', function() {
  let fakeBridge;
  let fakeWarnOnce;
  let fakeRootScope;
  let fakeSession;
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    fakeBridge = {
      call: sinon.stub(),
    };

    fakeWarnOnce = sinon.stub();

    fakeRootScope = {
      eventCallbacks: {},

      $broadcast: sandbox.stub(),

      $on: function(event, callback) {
        this.eventCallbacks[event] = callback;
      },
    };

    fakeSession = {
      load: sinon.stub(),
      state: {
        features: {
          feature_on: true,
          feature_off: false,
        },
      },
    };

    features.$imports.$mock({
      '../../shared/warn-once': fakeWarnOnce,
    });
  });

  afterEach(function() {
    features.$imports.$restore();
    sandbox.restore();
  });

  describe('flagEnabled', function() {
    it('should retrieve features data', function() {
      const features_ = features(fakeRootScope, fakeBridge, fakeSession);
      assert.equal(features_.flagEnabled('feature_on'), true);
      assert.equal(features_.flagEnabled('feature_off'), false);
    });

    it('should return false if features have not been loaded', function() {
      const features_ = features(fakeRootScope, fakeBridge, fakeSession);
      // simulate feature data not having been loaded yet
      fakeSession.state = {};
      assert.equal(features_.flagEnabled('feature_on'), false);
    });

    it('should trigger a refresh of session data', function() {
      const features_ = features(fakeRootScope, fakeBridge, fakeSession);
      features_.flagEnabled('feature_on');
      assert.calledOnce(fakeSession.load);
    });

    it('should return false for unknown flags', function() {
      const features_ = features(fakeRootScope, fakeBridge, fakeSession);
      assert.isFalse(features_.flagEnabled('unknown_feature'));
    });
  });

  it('should broadcast feature flags to annotation layer based on load/user changes', function() {
    assert.notProperty(fakeRootScope.eventCallbacks, events.USER_CHANGED);
    assert.notProperty(fakeRootScope.eventCallbacks, events.FRAME_CONNECTED);

    features(fakeRootScope, fakeBridge, fakeSession);

    assert.property(fakeRootScope.eventCallbacks, events.USER_CHANGED);
    assert.property(fakeRootScope.eventCallbacks, events.FRAME_CONNECTED);

    // respond to user changing by broadcasting the feature flags
    assert.notCalled(fakeBridge.call);

    fakeRootScope.eventCallbacks[events.USER_CHANGED]();

    assert.calledOnce(fakeBridge.call);
    assert.calledWith(
      fakeBridge.call,
      bridgeEvents.FEATURE_FLAGS_UPDATED,
      fakeSession.state.features
    );

    // respond to frame connections by broadcasting the feature flags
    fakeRootScope.eventCallbacks[events.FRAME_CONNECTED]();

    assert.calledTwice(fakeBridge.call);
    assert.calledWith(
      fakeBridge.call,
      bridgeEvents.FEATURE_FLAGS_UPDATED,
      fakeSession.state.features
    );
  });
});
