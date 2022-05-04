import { FeatureFlags, $imports } from '../features';

describe('FeatureFlags', () => {
  let fakeWarnOnce;

  const testFlags = {
    feature_on: true,
    feature_off: false,
  };

  beforeEach(() => {
    fakeWarnOnce = sinon.stub();
    $imports.$mock({
      '../shared/warn-once': { warnOnce: fakeWarnOnce },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createFeatureFlags() {
    return new FeatureFlags(Object.keys(testFlags));
  }

  describe('#update', () => {
    it('emits "flagsChanged" notification with new flags', () => {
      const onFlagsChanged = sinon.stub();
      const features = createFeatureFlags();

      features.on('flagsChanged', onFlagsChanged);
      features.update(testFlags);

      assert.calledOnce(onFlagsChanged);
    });

    it('updates flags returned by `flagEnabled`', () => {
      const features = createFeatureFlags();
      assert.isFalse(features.flagEnabled('feature_on'));

      features.update(testFlags);

      assert.isTrue(features.flagEnabled('feature_on'));
    });
  });

  describe('#flagEnabled', () => {
    it('returns current flag status', () => {
      const features = createFeatureFlags();

      features.update(testFlags);

      assert.isTrue(features.flagEnabled('feature_on'));
      assert.isFalse(features.flagEnabled('feature_off'));
    });

    it('returns false if flags are not loaded', () => {
      const features = createFeatureFlags();
      assert.isFalse(features.flagEnabled('feature_on'));
    });

    it('should warn when accessing unknown flags', () => {
      const features = createFeatureFlags();

      features.update(testFlags);

      assert.isFalse(features.flagEnabled('unknown_feature'));
      assert.calledOnce(fakeWarnOnce);
      assert.calledWith(fakeWarnOnce, 'Looked up unknown feature');
    });
  });

  describe('#allFlags', () => {
    it('returns a record with all feature flags', () => {
      const features = createFeatureFlags();

      features.update(testFlags);

      assert.deepEqual(features.allFlags(), testFlags);
    });
  });
});
