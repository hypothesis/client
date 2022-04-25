import { FeaturesService } from '../features';

describe('FeaturesService', () => {
  let fakeFrameSync;
  let fakeStore;

  beforeEach(() => {
    fakeFrameSync = {
      notifyHost: sinon.stub(),
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
  });

  function createService() {
    const service = new FeaturesService(fakeFrameSync, fakeStore);
    service.init();
    return service;
  }

  function notifyStoreSubscribers() {
    const subscribers = fakeStore.subscribe.args.map(args => args[0]);
    subscribers.forEach(s => s());
  }

  it('should broadcast feature flags to annotator if flags change', () => {
    createService();

    // First update, with no changes to feature flags.
    notifyStoreSubscribers();
    assert.notCalled(fakeFrameSync.notifyHost);

    // Second update, with changes to feature flags.
    fakeStore.profile.returns({
      features: {
        feature_on: true,
        feature_off: true,
      },
    });

    notifyStoreSubscribers();

    assert.calledWith(
      fakeFrameSync.notifyHost,
      'featureFlagsUpdated',
      fakeStore.profile().features
    );
  });
});
