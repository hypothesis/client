import { act } from 'preact/test-utils';
import { mount } from 'enzyme';

import { EventBus } from '../../util/emitter';
import { ProfileModal } from '../ProfileModal';

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

  it('hides modal on first render', () => {
    const wrapper = createComponent();
    const outer = wrapper.find(outerSelector);

    assert.isTrue(outer.hasClass('hidden'));
  });

  it('shows modal on "openProfile" event', () => {
    const wrapper = createComponent();

    emitter.publish('openProfile', 'myGroup');
    wrapper.update();

    const outer = wrapper.find(outerSelector);
    assert.isFalse(outer.hasClass('hidden'));

    const iframe = wrapper.find('iframe');
    assert.equal(iframe.prop('src'), profileURL);
  });

  it('hides modal on closing', () => {
    const wrapper = createComponent();

    emitter.publish('openProfile', 'myGroup');
    wrapper.update();

    let outer = wrapper.find(outerSelector);
    assert.isFalse(outer.hasClass('hidden'));

    act(() => {
      wrapper.find('IconButton').prop('onClick')();
    });
    wrapper.update();

    outer = wrapper.find(outerSelector);

    assert.isTrue(outer.hasClass('hidden'));
  });
});
