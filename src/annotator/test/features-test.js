'use strict';

var events = require('../../shared/bridge-events');
var features = require('../features');

describe('features - annotation layer', function () {

  var featureFlagsUpdateHandler;
  var initialFeatures = {
    feature_on: true,
    feature_off: false,
  };

  var setFeatures = function(features){
    featureFlagsUpdateHandler(features || initialFeatures);
  };

  beforeEach(function () {
    sinon.stub(console, 'warn');

    features.init({
      on: function(topic, handler){
        if(topic === events.FEATURE_FLAGS_UPDATED){
          featureFlagsUpdateHandler = handler;
        }
      },
    });

    // set default features
    setFeatures();
  });

  afterEach(function () {
    console.warn.restore();
    features.reset();
  });

  describe('flagEnabled', function () {

    it('should retrieve features data', function () {
      assert.equal(features.flagEnabled('feature_on'), true);
      assert.equal(features.flagEnabled('feature_off'), false);
    });

    it('should return false if features have not been loaded', function () {
      // simulate feature data not having been loaded yet
      features.reset();
      assert.equal(features.flagEnabled('feature_on'), false);
    });

    it('should return false for unknown flags', function () {
      assert.isFalse(features.flagEnabled('unknown_feature'));
    });

    it('should warn when accessing unknown flags', function () {
      assert.notCalled(console.warn);
      assert.isFalse(features.flagEnabled('unknown_feature'));
      assert.calledOnce(console.warn);
      assert.calledWith(console.warn, 'looked up unknown feature');
    });
  });
});
