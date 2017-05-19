'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

function pageObject(element) {
  return {
    menuLinks: function () {
      return Array.from(element[0].querySelectorAll('.login-control-menu .dropdown-menu a'))
                  .map(function (el) { return el.textContent; });
    },
    menuText: function () {
      return element[0].querySelector('span').textContent;
    },
    userProfileButton: element[0].querySelector('.dropdown-menu__user-profile-btn'),
    disabledUserProfileButton: element[0].querySelector('.dropdown-menu__disabled-user-profile-btn'),
    accountSettingsButton: element[0].querySelector('.dropdown-menu__account-settings-btn'),
    helpButton: element[0].querySelector('.dropdown-menu__help-btn'),
    logOutButton: element[0].querySelector('.dropdown-menu__log-out-btn'),
  };
}

function createLoginControl(inputs) {
  return util.createDirective(
    document, 'loginControl', Object.assign({}, inputs));
}

function unknownAuthStatusPage() {
  return pageObject(createLoginControl({
    auth: {status: 'unknown'},
    newStyle: true,
  }));
}

function loggedOutPage() {
  return pageObject(createLoginControl({
    auth: {status: 'logged-out'},
    newStyle: true,
  }));
}

function firstPartyUserPage() {
  return pageObject(createLoginControl({
    auth: {username: 'someUsername', status: 'logged-in'},
    newStyle: true,
  }));
}

function thirdPartyUserPage() {
  return pageObject(createLoginControl({
    auth: {
      userid: 'acct:someUsername@anotherFakeDomain',
      username: 'someUsername',
      status: 'logged-in',
    },
    newStyle: true,
  }));
}

describe('loginControl', function () {
  before(function () {
    angular.module('app', [])
      .component('loginControl', require('../login-control'));
  });

  beforeEach(function () {
    var fakeServiceUrl = sinon.stub().returns('someUrl');
    var fakeSettings = {
      authDomain: 'fakeDomain',
    };

    angular.mock.module('app', {
      serviceUrl: fakeServiceUrl,
      settings: fakeSettings,
    });
  });

  describe('the user profile button', function() {

    /**
     * Return true if the user profile button is enabled, false if it's
     * disabled, and null if no user profile button is rendered.
     */
    function isUserProfileButtonEnabled(page) {
      var enabledUserProfileButton  = page.userProfileButton;
      var disabledUserProfileButton = page.disabledUserProfileButton;

      assert.isTrue(
        enabledUserProfileButton === null || disabledUserProfileButton === null,
        'It should never show both the enabled and disabled buttons at once'
      );

      if (enabledUserProfileButton) {
        return true;
      }

      if (disabledUserProfileButton) {
        return false;
      }

      return null;
    }

    context('when the user auth status is unknown', function () {
      it('does not show the user profile button', function () {
        assert.isNull(isUserProfileButtonEnabled(unknownAuthStatusPage()));
      });
    });

    context('when the user is logged out', function () {
      it('does not show the user profile button', function () {
        assert.isNull(isUserProfileButtonEnabled(loggedOutPage()));
      });
    });

    context('when a first-party user is logged in', function () {
      it('shows the enabled user profile button', function () {
        assert.isTrue(isUserProfileButtonEnabled(firstPartyUserPage()));
      });
    });

    context('when a third-party user is logged in', function () {
      it('shows the disabled user profile button', function () {
        assert.isFalse(isUserProfileButtonEnabled(thirdPartyUserPage()));
      });
    });
  });

  describe('the account settings button', function () {
    context('when the user auth status is unknown', function () {
      it('does not show', function () {
        assert.isNull(unknownAuthStatusPage().accountSettingsButton);
      });
    });

    context('when the user is logged out', function () {
      it('does not show', function () {
        assert.isNull(loggedOutPage().accountSettingsButton);
      });
    });

    context('when a first-party user is logged in', function () {
      it('does show', function () {
        assert.isNotNull(firstPartyUserPage().accountSettingsButton);
      });
    });

    context('when a third-party user is logged in', function () {
      it('does not show', function () {
        assert.isNull(thirdPartyUserPage().accountSettingsButton);
      });
    });
  });

  describe('the help button', function () {
    context('when the user auth status is unknown', function () {
      it('does show', function () {
        assert.isNotNull(unknownAuthStatusPage().helpButton);
      });
    });

    context('when the user is logged out', function () {
      it('does show', function () {
        assert.isNotNull(loggedOutPage().helpButton);
      });
    });

    context('when a first-party user is logged in', function () {
      it('does show', function () {
        assert.isNotNull(firstPartyUserPage().helpButton);
      });
    });

    context('when a third-party user is logged in', function () {
      it('does show', function () {
        assert.isNotNull(thirdPartyUserPage().helpButton);
      });
    });
  });

  describe('the log out button', function () {
    context('when the user auth status is unknown', function () {
      it('does not show', function () {
        assert.isNull(unknownAuthStatusPage().logOutButton);
      });
    });

    context('when the user is logged out', function () {
      it('does not show', function () {
        assert.isNull(loggedOutPage().logOutButton);
      });
    });

    context('when a first-party user is logged in', function () {
      it('does show', function () {
        assert.isNotNull(firstPartyUserPage().logOutButton);
      });
    });

    context('when a third-party user is logged in', function () {
      it('does not show', function () {
        assert.isNull(thirdPartyUserPage().logOutButton);
      });
    });
  });

  context('old controls when a H user is logged in', function () {
    it('shows the complete list of menu options', function () {
      var el = createLoginControl({
        auth: {
          username: 'someUsername',
          status: 'logged-in',
        },
        newStyle: false,
      });
      var page = pageObject(el);

      assert.deepEqual(page.menuLinks(),
        ['Account', 'Help', 'My Annotations', 'Log out']);
      assert.include(page.menuText(), 'someUsername');
    });
  });

  context('old controls when user is logged out', function () {
    it('shows the help and log in menu options', function () {
      var el = createLoginControl({
        auth: {
          status: 'logged-out',
        },
        newStyle: false,
      });
      var page = pageObject(el);

      assert.include(page.menuText(), 'Log in');
      assert.deepEqual(page.menuLinks(), ['Help']);
    });
  });

  context('old controls when auth status is unknown', function () {
    it('shows the help menu option', function () {
      var el = createLoginControl({
        auth: {
          status: 'unknown',
        },
        newStyle: false,
      });
      var page = pageObject(el);

      assert.equal(page.menuText(), '⋯');
      assert.deepEqual(page.menuLinks(), ['Help']);
    });
  });
});
