import { mount } from '@hypothesis/frontend-testing';
import { act } from 'preact/test-utils';

import { EventBus } from '../../util/emitter';
import ProfileModal from '../ProfileModal';

describe('ProfileModal', () => {
  const profileURL = 'https://test.hypothes.is/user-profile';

  let eventBus;
  let emitter;

  const outerSelector = '[data-testid="profile-outer"]';

  const createComponent = config => {
    return mount(
      <ProfileModal
        eventBus={eventBus}
        config={{ profileAppUrl: profileURL, ...config }}
      />,
      { connected: true },
    );
  };

  beforeEach(() => {
    eventBus = new EventBus();
    emitter = eventBus.createEmitter();
  });

  it('does not render anything while the modal is closed', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find(outerSelector).length, 0);
  });

  it('shows modal on "openProfile" event', () => {
    const wrapper = createComponent();

    act(() => {
      emitter.publish('openProfile');
    });
    wrapper.update();

    assert.isTrue(wrapper.find(outerSelector).exists());

    const iframe = wrapper.find('iframe');
    assert.equal(iframe.prop('src'), profileURL);
  });

  it("removes the modal's content on closing", () => {
    const wrapper = createComponent();

    act(() => {
      emitter.publish('openProfile');
    });
    wrapper.update();

    assert.isTrue(wrapper.find(outerSelector).exists());

    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });
    wrapper.update();

    assert.isFalse(wrapper.find(outerSelector).exists());
  });
});
