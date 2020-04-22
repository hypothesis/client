import bridgeEvents from '../../../shared/bridge-events';
import features from '../features';
import { $imports } from '../features';

describe('sidebar/services/features', function () {
  let fakeBridge;
  let fakeWarnOnce;
  let fakeSession;
  let fakeStore;

  beforeEach(function () {
    fakeBridge = {
      call: sinon.stub(),
    };

    fakeWarnOnce = sinon.stub();

    fakeSession = {
      load: sinon.stub(),
    };

    fakeStore = {
      subscribe: sinon.stub(),
      frames: sinon.stub().returns([]),
      profile: sinon.stub().returns({
        features: {
          feature_on: true,
          feature_off: false,
        },
      }),
    };

    $imports.$mock({
      '../../shared/warn-once': fakeWarnOnce,
    });
  });

  afterEach(function () {
    $imports.$restore();
  });

  function createService() {
    return features(fakeBridge, fakeSession, fakeStore);
  }

  describe('flagEnabled', function () {
    it('should retrieve features data', function () {
      const features_ = createService();
      assert.equal(features_.flagEnabled('feature_on'), true);
      assert.equal(features_.flagEnabled('feature_off'), false);
    });

    it('should return false if features have not been loaded', function () {
      const features_ = createService();
      // Simulate feature data not having been loaded yet
      fakeStore.profile.returns({});
      assert.equal(features_.flagEnabled('feature_on'), false);
    });

    it('should trigger a refresh of session data', function () {
      const features_ = createService();
      features_.flagEnabled('feature_on');
      assert.calledOnce(fakeSession.load);
    });

    it('should return false for unknown flags', function () {
      const features_ = createService();
      assert.isFalse(features_.flagEnabled('unknown_feature'));
    });
  });

  function notifyStoreSubscribers() {
    const subscribers = fakeStore.subscribe.args.map(args => args[0]);
    subscribers.forEach(s => s());
  }

  it('should broadcast feature flags to annotator if flags change', () => {
    createService();

    // First update, with no changes to feature flags.
    notifyStoreSubscribers();
    assert.notCalled(fakeBridge.call);

    // Second update, with changes to feature flags.
    fakeStore.profile.returns({
      features: {
        feature_on: true,
        feature_off: true,
      },
    });

    notifyStoreSubscribers();

    assert.calledWith(
      fakeBridge.call,
      bridgeEvents.FEATURE_FLAGS_UPDATED,
      fakeStore.profile().features
    );
  });

  it('should broadcast feature flags to annotator if a new frame connects', () => {
    createService();

    // First update, with no changes to frames.
    notifyStoreSubscribers();
    assert.notCalled(fakeBridge.call);

    // Second update, with changes to frames.
    fakeStore.frames.returns([{ uri: 'https://example.com' }]);

    notifyStoreSubscribers();

    assert.calledWith(
      fakeBridge.call,
      bridgeEvents.FEATURE_FLAGS_UPDATED,
      fakeStore.profile().features
    );
  });
});
