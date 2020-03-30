import events from '../../shared/bridge-events';
import features from '../features';
import { $imports } from '../features';

describe('features - annotation layer', function () {
  let featureFlagsUpdateHandler;
  let fakeWarnOnce;

  const initialFeatures = {
    feature_on: true,
    feature_off: false,
  };

  const setFeatures = function (features) {
    featureFlagsUpdateHandler(features || initialFeatures);
  };

  beforeEach(function () {
    fakeWarnOnce = sinon.stub();
    $imports.$mock({
      '../shared/warn-once': fakeWarnOnce,
    });

    features.init({
      on: function (topic, handler) {
        if (topic === events.FEATURE_FLAGS_UPDATED) {
          featureFlagsUpdateHandler = handler;
        }
      },
    });

    // set default features
    setFeatures();
  });

  afterEach(function () {
    features.reset();
    $imports.$restore();
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
      assert.isFalse(features.flagEnabled('unknown_feature'));
      assert.calledOnce(fakeWarnOnce);
      assert.calledWith(fakeWarnOnce, 'looked up unknown feature');
    });
  });
});
