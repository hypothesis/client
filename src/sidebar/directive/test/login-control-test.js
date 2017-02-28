'use strict';

var angular = require('angular');

var util = require('./util');

function PageObject(element) {
  this.unknownLoginText = function () {
    return element[0].querySelector('.login-text').textContent;
  };
  this.loginText = function () {
    return Array.from(element[0].querySelectorAll('.login-text a'))
      .map(function (el) { return el.textContent; });
  };
  this.menuLinks = function () {
    return Array.from(element[0].querySelectorAll('.login-control-menu .dropdown-menu a'))
      .map(function (el) { return el.textContent; });
  };
  this.disabledMenuItems = function () {
    return Array.from(element[0].querySelectorAll('.login-control-menu .dropdown-menu__link--disabled'))
      .map(function (el) { return el.textContent.trim(); });
  };
  this.menuText = function () {
    return element[0].querySelector('span').textContent;
  };
}

describe('loginControl', function () {
  before(function () {
    angular.module('app', [])
      .directive('loginControl', require('../login-control'));
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
      var pageObject = new PageObject(el);

      assert.equal(pageObject.unknownLoginText(), '⋯');
      assert.deepEqual(pageObject.menuLinks(), ['Help']);
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
      var pageObject = new PageObject(el);

      assert.deepEqual(pageObject.loginText(), ['Sign up', 'Log in']);
      assert.deepEqual(pageObject.menuLinks(), ['Help']);
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
      var pageObject = new PageObject(el);

      assert.deepEqual(pageObject.menuLinks(),
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
      var pageObject = new PageObject(el);

      assert.deepEqual(pageObject.menuLinks(), ['Help']);
      assert.deepEqual(pageObject.disabledMenuItems(), ['someUsername']);
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
      var pageObject = new PageObject(el);

      assert.deepEqual(pageObject.menuLinks(),
        ['Account', 'Help', 'My Annotations', 'Log out']);
      assert.include(pageObject.menuText(), 'someUsername');
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
      var pageObject = new PageObject(el);

      assert.include(pageObject.menuText(), 'Log in');
      assert.deepEqual(pageObject.menuLinks(), ['Help']);
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
      var pageObject = new PageObject(el);

      assert.equal(pageObject.menuText(), '⋯');
      assert.deepEqual(pageObject.menuLinks(), ['Help']);
    });
  });
});
