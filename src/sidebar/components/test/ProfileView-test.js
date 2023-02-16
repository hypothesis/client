import { mount } from 'enzyme';

import ProfileView, { $imports } from '../ProfileView';

describe('ProfileView', () => {
  let fakeStore;
  let fakeIsFeatureEnabled;

  beforeEach(() => {
    fakeIsFeatureEnabled = sinon.stub().returns(true);
    fakeStore = {
      isFeatureEnabled: fakeIsFeatureEnabled,
    };

    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const createComponent = () => mount(<ProfileView />);

  it('renders content when feature flag is enabled', () => {
    const wrapper = createComponent();
    assert.isTrue(wrapper.find('[data-testid="profile-container"]').exists());
  });

  it('does not render content when feature flag is disabled', () => {
    fakeIsFeatureEnabled.returns(false);

    const wrapper = createComponent();
    assert.isFalse(wrapper.find('[data-testid="profile-container"]').exists());
  });
});
