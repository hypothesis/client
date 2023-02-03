import { useEffect } from 'preact/hooks';
import { act } from 'preact/test-utils';

import { Profile, $imports } from '../profile';
import { EventBus } from '../util/emitter';

describe('Profile', () => {
  // `Profile` instances created by current test
  let profiles;
  let container;
  let cleanUpCallback;

  const createProfile = (config = {}) => {
    const eventBus = new EventBus();
    const profile = new Profile(container, eventBus, config);

    profiles.push(profile);

    return profile;
  };

  beforeEach(() => {
    profiles = [];
    container = document.createElement('div');
    cleanUpCallback = sinon.stub();

    const FakeProfileModal = () => {
      useEffect(() => {
        return () => {
          cleanUpCallback();
        };
      }, []);
      return <div id="profile-modal" />;
    };

    $imports.$mock({
      './components/ProfileModal': { ProfileModal: FakeProfileModal },
    });
  });

  afterEach(() => {
    profiles.forEach(n => n.destroy());
    $imports.$restore();
  });

  describe('profile container', () => {
    it('creates the container', () => {
      assert.isFalse(container.hasChildNodes());
      const profile = createProfile();
      const shadowRoot = profile._outerContainer.shadowRoot;
      assert.isNotNull(shadowRoot);
      assert.isNotNull(shadowRoot.querySelector('#profile-modal'));
    });

    it('removes the container', () => {
      const profile = createProfile();
      profile.destroy();
      assert.isFalse(container.hasChildNodes());
    });

    it('calls the clean up function of the ProfileModal when the container is removed', () => {
      // Necessary to run the useEffect for first time and register the cleanup function
      let profile;
      act(() => {
        profile = createProfile();
      });
      // Necessary to run the cleanup function of the useEffect
      act(() => {
        profile.destroy();
      });
      assert.called(cleanUpCallback);
    });
  });
});
