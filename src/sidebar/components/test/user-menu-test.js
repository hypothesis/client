'use strict';

const { createElement } = require('preact');
const { shallow } = require('enzyme');

const UserMenu = require('../user-menu');
const MenuItem = require('../menu-item');

describe('UserMenu', () => {
  let fakeAuth;
  let fakeBridge;
  let fakeIsThirdPartyUser;
  let fakeOnLogout;
  let fakeProfileBridgeEvent;
  let fakeServiceConfig;
  let fakeServiceUrl;
  let fakeSettings;

  const createUserMenu = () => {
    return shallow(
      <UserMenu
        auth={fakeAuth}
        bridge={fakeBridge}
        onLogout={fakeOnLogout}
        serviceUrl={fakeServiceUrl}
        settings={fakeSettings}
      />
    ).dive(); // Dive needed because this component uses `withServices`
  };

  const findMenuItem = (wrapper, labelText) => {
    return wrapper
      .find(MenuItem)
      .filterWhere(n => n.prop('label') === labelText);
  };

  beforeEach(() => {
    fakeAuth = {
      displayName: 'Eleanor Fishtail',
      status: 'logged-in',
      userid: 'acct:eleanorFishtail@hypothes.is',
      username: 'eleanorFishy',
    };
    fakeBridge = { call: sinon.stub() };
    fakeIsThirdPartyUser = sinon.stub();
    fakeOnLogout = sinon.stub();
    fakeProfileBridgeEvent = 'profile-requested';
    fakeServiceConfig = sinon.stub();
    fakeServiceUrl = sinon.stub();
    fakeSettings = {
      authDomain: 'hypothes.is',
    };

    UserMenu.$imports.$mock({
      '../util/account-id': {
        isThirdPartyUser: fakeIsThirdPartyUser,
      },
      '../service-config': fakeServiceConfig,
      '../../shared/bridge-events': {
        PROFILE_REQUESTED: fakeProfileBridgeEvent,
      },
    });
  });

  afterEach(() => {
    UserMenu.$imports.$restore();
  });

  describe('profile menu item', () => {
    context('first-party user', () => {
      beforeEach(() => {
        fakeIsThirdPartyUser.returns(false);
        fakeServiceUrl.returns('profile-link');
      });

      it('should be enabled', () => {
        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        assert.notOk(profileMenuItem.prop('isDisabled'));
      });

      it('should have a link (href)', () => {
        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        assert.equal(profileMenuItem.prop('href'), 'profile-link');
      });

      it('should have a callback', () => {
        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
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

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        assert.isTrue(profileMenuItem.prop('isDisabled'));
      });

      it('should be disabled if service feature not supported', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: false });

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        assert.isTrue(profileMenuItem.prop('isDisabled'));
      });

      it('should be enabled if service feature support', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: true });

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        assert.notOk(profileMenuItem.prop('isDisabled'));
      });

      it('should have a callback if enabled', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: true });

        const wrapper = createUserMenu();

        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        assert.isFunction(profileMenuItem.prop('onClick'));
      });
    });

    describe('profile-selected callback', () => {
      it('should fire profile event for third-party user', () => {
        fakeServiceConfig.returns({ onProfileRequestProvided: true });
        fakeIsThirdPartyUser.returns(true);
        const wrapper = createUserMenu();
        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        const onProfileSelected = profileMenuItem.prop('onClick');

        onProfileSelected();

        assert.equal(fakeBridge.call.callCount, 1);
        assert.calledWith(fakeBridge.call, fakeProfileBridgeEvent);
      });

      it('should not fire profile event for first-party user', () => {
        fakeIsThirdPartyUser.returns(false);
        const wrapper = createUserMenu();
        const profileMenuItem = findMenuItem(wrapper, fakeAuth.displayName);
        const onProfileSelected = profileMenuItem.prop('onClick');

        onProfileSelected();

        assert.equal(fakeBridge.call.callCount, 0);
      });
    });
  });

  describe('account settings menu item', () => {
    it('should be present if first-party user', () => {
      fakeIsThirdPartyUser.returns(false);

      const wrapper = createUserMenu();

      const accountMenuItem = findMenuItem(wrapper, 'Account settings');
      assert.isTrue(accountMenuItem.exists());
      assert.calledWith(fakeServiceUrl, 'account.settings');
    });

    it('should not be present if third-party user', () => {
      fakeIsThirdPartyUser.returns(true);

      const wrapper = createUserMenu();

      const accountMenuItem = findMenuItem(wrapper, 'Account settings');
      assert.isFalse(accountMenuItem.exists());
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
        it:
          'should be present for first-party user if service supports `onLogoutRequest`',
        isThirdParty: false,
        serviceConfigReturns: { onLogoutRequestProvided: true },
        expected: true,
      },
      {
        it:
          'should be present for first-party user if service does not support `onLogoutRequest`',
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
        it:
          'should be present for third-party user if service supports `onLogoutRequest`',
        isThirdParty: true,
        serviceConfigReturns: { onLogoutRequestProvided: true },
        expected: true,
      },
      {
        it:
          'should be absent for third-party user if `onLogoutRequest` not supported',
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
