import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { EventBus } from '../../util/emitter';
import ProfileModal from '../ProfileModal';

describe('ProfileModal', () => {
  const profileURL = 'https://test.hypothes.is/user-profile';

  let components;
  let eventBus;
  let emitter;

  const outerSelector = '[data-testid="profile-outer"]';

  const createComponent = config => {
    const component = mount(
      <ProfileModal
        eventBus={eventBus}
        config={{ profileAppUrl: profileURL, ...config }}
      />
    );
    components.push(component);
    return component;
  };

  beforeEach(() => {
    components = [];
    eventBus = new EventBus();
    emitter = eventBus.createEmitter();
  });

  afterEach(() => {
    components.forEach(component => component.unmount());
  });

  it('does not render anything while the modal is closed', () => {
    const wrapper = createComponent();
    assert.equal(wrapper.find(outerSelector).length, 0);
  });

  it('shows modal on "openProfile" event', () => {
    const wrapper = createComponent();

    emitter.publish('openProfile');
    wrapper.update();

    assert.isTrue(wrapper.find(outerSelector).exists());

    const iframe = wrapper.find('iframe');
    assert.equal(iframe.prop('src'), profileURL);
  });

  it("removes the modal's content on closing", () => {
    const wrapper = createComponent();

    emitter.publish('openProfile');
    wrapper.update();

    assert.isTrue(wrapper.find(outerSelector).exists());

    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });
    wrapper.update();

    assert.isFalse(wrapper.find(outerSelector).exists());
  });
});
