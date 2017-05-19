'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

function pageObject(element) {
  return {
    unknownLoginText: function () {
      return element[0].querySelector('.login-text').textContent;
    },
    loginText: function () {
      return Array.from(element[0].querySelectorAll('.login-text a'))
        .map(function (el) { return el.textContent; });
    },
    menuLinks: function () {
      return Array.from(element[0].querySelectorAll('.login-control-menu .dropdown-menu a'))
                  .map(function (el) { return el.textContent; });
    },
    disabledMenuItems: function () {
      return Array.from(element[0].querySelectorAll('.login-control-menu .dropdown-menu__link--disabled'))
        .map(function (el) { return el.textContent.trim(); });
    },
    menuText: function () {
      return element[0].querySelector('span').textContent;
    },
  };
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

  function createLoginControl(inputs) {
    var defaultInputs = {};

    return util.createDirective(document, 'loginControl',
      Object.assign(defaultInputs, inputs));
  }

  context('when user auth status is unknown', function () {
    it('only shows the help menu option', function () {
      var el = createLoginControl({
        auth: {
          status: 'unknown',
        },
        newStyle: true,
      });
      var page = pageObject(el);

      assert.equal(page.unknownLoginText(), '⋯');
      assert.deepEqual(page.menuLinks(), ['Help']);
    });
  });

  context('when user is logged out', function () {
    it('only shows the help menu option', function () {
      var el = createLoginControl({
        auth: {
          status: 'logged-out',
        },
        newStyle: true,
      });
      var page = pageObject(el);

      assert.deepEqual(page.loginText(), ['Sign up', 'Log in']);
      assert.deepEqual(page.menuLinks(), ['Help']);
    });
  });

  context('when a H user is logged in', function () {
    it('shows the complete list of menu options', function () {
      var el = createLoginControl({
        auth: {
          username: 'someUsername',
          status: 'logged-in',
        },
        newStyle: true,
      });
      var page = pageObject(el);

      assert.deepEqual(page.menuLinks(),
        ['someUsername', 'Account settings', 'Help', 'Log out']);
    });
  });

  context('when a third party user is logged in', function () {
    it('shows the help menu option and the username', function () {
      var el = createLoginControl({
        auth: {
          userid: 'acct:someUsername@anotherFakeDomain',
          username: 'someUsername',
          status: 'logged-in',
        },
        newStyle: true,
      });
      var page = pageObject(el);

      assert.deepEqual(page.menuLinks(), ['Help']);
      assert.deepEqual(page.disabledMenuItems(), ['someUsername']);
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
