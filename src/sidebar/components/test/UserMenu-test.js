import { mount } from 'enzyme';
import { act } from 'preact/test-utils';

import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import UserMenu, { $imports } from '../UserMenu';

describe('UserMenu', () => {
  let fakeProfile;
  let fakeFrameSync;
  let fakeIsThirdPartyUser;
  let fakeOnLogout;
  let fakeServiceConfig;
  let fakeSettings;
  let fakeStore;
  let fakeIsFeatureEnabled;

  const createUserMenu = () => {
    return mount(
      <UserMenu
        frameSync={fakeFrameSync}
        onLogout={fakeOnLogout}
        settings={fakeSettings}
      />,
    );
  };

  const findMenuItem = (wrapper, labelText) => {
    return wrapper
      .find('MenuItem')
      .filterWhere(n => n.prop('label') === labelText);
  };

  beforeEach(() => {
    fakeProfile = {
      user_info: {
        display_name: 'Eleanor Fishtail',
      },
      userid: 'acct:eleanorFishtail@hypothes.is',
    };
    fakeFrameSync = { notifyHost: sinon.stub() };
    fakeIsThirdPartyUser = sinon.stub();
    fakeOnLogout = sinon.stub();
    fakeServiceConfig = sinon.stub();
    fakeSettings = {};
    fakeIsFeatureEnabled = sinon.stub().returns(false);
    fakeStore = {
      defaultAuthority: sinon.stub().returns('hypothes.is'),
      focusedGroupId: sinon.stub().returns('mygroup'),
      getLink: sinon.stub(),
      profile: sinon.stub().returns(fakeProfile),
      isFeatureEnabled: fakeIsFeatureEnabled,
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../helpers/account-id': {
        isThirdPartyUser: fakeIsThirdPartyUser,
      },
      '../config/service-config': { serviceConfig: fakeServiceConfig },
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('profile menu item', () => {
    context('first-party user', () => {
      beforeEach(() => {
        fakeIsThirdPartyUser.returns(false);
        fakeStore.getLink.returns('profile-link');
      });

      it('should be enabled', () => {
        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.notOk(profileMenuItem.prop('isDisabled'));
      });

      it('should have a link (href)', () => {
        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.equal(profileMenuItem.prop('href'), 'profile-link');
      });

      it('should have a callback', () => {
        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.isFunction(profileMenuItem.prop('onClick'));
      });
    });

    context('third-party user', () => {
      beforeEach(() => {
        fakeIsThirdPartyUser.returns(true);
      });

      it('should be disabled if no service configured', () => {
        fakeServiceConfig.returns(null);

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.isTrue(profileMenuItem.prop('isDisabled'));
      });

      it('should be disabled if service feature not supported', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: false });

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.isTrue(profileMenuItem.prop('isDisabled'));
      });

      it('should be enabled if service feature support', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: true });

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.notOk(profileMenuItem.prop('isDisabled'));
      });

      it('should have a callback if enabled', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: true });

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        assert.isFunction(profileMenuItem.prop('onClick'));
      });
    });

    describe('profile-selected callback', () => {
      it('should fire profile event for third-party user', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: true });
        fakeIsThirdPartyUser.returns(true);
        const wrapper = createUserMenu();
        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        const onProfileSelected = profileMenuItem.prop('onClick');

        onProfileSelected();

        assert.equal(fakeFrameSync.notifyHost.callCount, 1);
        assert.calledWith(fakeFrameSync.notifyHost, 'profileRequested');
      });

      it('should not fire profile event for first-party user', () => {
        fakeIsThirdPartyUser.returns(false);
        const wrapper = createUserMenu();
        const profileMenuItem = findMenuItem(
          wrapper,
          fakeProfile.user_info.display_name,
        );
        const onProfileSelected = profileMenuItem.prop('onClick');

        onProfileSelected();

        assert.equal(fakeFrameSync.notifyHost.callCount, 0);
      });
    });
  });

  describe('account settings menu item', () => {
    it('should be present if first-party user', () => {
      fakeIsThirdPartyUser.returns(false);

      const wrapper = createUserMenu();

      const accountMenuItem = findMenuItem(wrapper, 'Account settings');
      assert.isTrue(accountMenuItem.exists());
      assert.calledWith(fakeStore.getLink, 'account.settings');
    });

    it('should not be present if third-party user', () => {
      fakeIsThirdPartyUser.returns(true);

      const wrapper = createUserMenu();

      const accountMenuItem = findMenuItem(wrapper, 'Account settings');
      assert.isFalse(accountMenuItem.exists());
    });
  });

  describe('open profile item', () => {
    [{ isFeatureEnabled: true }, { isFeatureEnabled: false }].forEach(
      ({ isFeatureEnabled }) => {
        it('includes profile item only for users with the feature flag enabled', () => {
          fakeIsFeatureEnabled.returns(isFeatureEnabled);

          const wrapper = createUserMenu();
          const openProfileItem = findMenuItem(wrapper, 'Your profile');

          assert.equal(isFeatureEnabled, openProfileItem.exists());
        });
      },
    );

    it('opens the profile when clicked', () => {
      fakeIsFeatureEnabled.returns(true);
      fakeIsThirdPartyUser.returns(true);

      const wrapper = createUserMenu();
      const openProfileItem = findMenuItem(wrapper, 'Your profile');

      openProfileItem.props().onClick();
      assert.calledOnce(fakeFrameSync.notifyHost);
      assert.calledWith(fakeFrameSync.notifyHost, 'openProfile');
    });

    [{ featureIsEnabled: true }, { featureIsEnabled: false }].forEach(
      ({ featureIsEnabled }) => {
        it('responds to `p` keypress only when feature is enabled', () => {
          fakeIsFeatureEnabled.returns(featureIsEnabled);

          const wrapper = createUserMenu();
          // Make the menu "open"
          act(() => wrapper.find('Menu').props().onOpenChanged(true));
          wrapper.update();
          assert.isTrue(wrapper.find('Menu').props().open);

          wrapper
            .find('[data-testid="user-menu"]')
            .simulate('keydown', { key: 'p' });

          assert.equal(featureIsEnabled, fakeFrameSync.notifyHost.called);
          assert.equal(!featureIsEnabled, wrapper.find('Menu').props().open);
        });
      },
    );
  });

  describe('open notebook item', () => {
    it('includes the open notebook item', () => {
      const wrapper = createUserMenu();

      const openNotebookItem = findMenuItem(wrapper, 'Open notebook');
      assert.isTrue(openNotebookItem.exists());
    });

    it('triggers a message when open-notebook item is clicked', () => {
      const wrapper = createUserMenu();

      const openNotebookItem = findMenuItem(wrapper, 'Open notebook');
      openNotebookItem.props().onClick();
      assert.calledOnce(fakeFrameSync.notifyHost);
      assert.calledWith(fakeFrameSync.notifyHost, 'openNotebook', 'mygroup');
    });

    it('opens the notebook and closes itself when `n` is typed', () => {
      const wrapper = createUserMenu();
      // Make the menu "open"
      act(() => {
        wrapper.find('Menu').props().onOpenChanged(true);
      });
      wrapper.update();
      assert.isTrue(wrapper.find('Menu').props().open);

      wrapper
        .find('[data-testid="user-menu"]')
        .simulate('keydown', { key: 'n' });
      assert.calledOnce(fakeFrameSync.notifyHost);
      assert.calledWith(fakeFrameSync.notifyHost, 'openNotebook', 'mygroup');
      // Now the menu is "closed" again
      assert.isFalse(wrapper.find('Menu').props().open);
    });
  });

  describe('log out menu item', () => {
    const tests = [
      {
        it: 'should be present for first-party user if no service configured',
        isThirdParty: false,
        serviceConfigReturns: null,
        expected: true,
      },
      {
        it: 'should be present for first-party user if service supports `onLogoutRequest`',
        isThirdParty: false,
        serviceConfigReturns: { onLogoutRequestProvided: true },
        expected: true,
      },
      {
        it: 'should be present for first-party user if service does not support `onLogoutRequest`',
        isThirdParty: false,
        serviceConfigReturns: { onLogoutRequestProvided: false },
        expected: true,
      },
      {
        it: 'should be absent for third-party user if no service configured',
        isThirdParty: true,
        serviceConfigReturns: null,
        expected: false,
      },
      {
        it: 'should be present for third-party user if service supports `onLogoutRequest`',
        isThirdParty: true,
        serviceConfigReturns: { onLogoutRequestProvided: true },
        expected: true,
      },
      {
        it: 'should be absent for third-party user if `onLogoutRequest` not supported',
        isThirdParty: true,
        serviceConfigReturns: { onLogoutRequestProvided: false },
        expected: false,
      },
    ];

    tests.forEach(test => {
      it(test.it, () => {
        fakeIsThirdPartyUser.returns(test.isThirdParty);
        fakeServiceConfig.returns(test.serviceConfigReturns);

        const wrapper = createUserMenu();

        const logOutMenuItem = findMenuItem(wrapper, 'Log out');
        assert.equal(logOutMenuItem.exists(), test.expected);
        if (test.expected) {
          assert.equal(logOutMenuItem.prop('onClick'), fakeOnLogout);
        }
      });
    });
  });
});
