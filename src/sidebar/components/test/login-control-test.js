'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

const loginControl = require('../login-control');

describe('loginControl', function() {
  before(function() {
    angular.module('app', []).component('loginControl', loginControl);
  });

  beforeEach(function() {
    angular.mock.module('app', {});
  });

  describe('sign up and log in links', () => {
    it('should render empty login and signup element if user auth status is unknown', () => {
      const el = util.createDirective(document, 'loginControl', {
        auth: {
          username: 'someUsername',
          status: 'unknown',
        },
        newStyle: true,
      });
      const loginEl = el.find('.login-text');
      const links = loginEl.find('a');
      assert.lengthOf(loginEl, 1);
      assert.lengthOf(links, 0);
    });

    it('should render login and signup links if user is logged out', () => {
      const el = util.createDirective(document, 'loginControl', {
        auth: {
          username: 'someUsername',
          status: 'logged-out',
        },
        newStyle: true,
      });
      const loginEl = el.find('.login-text');
      const links = loginEl.find('a');
      assert.lengthOf(loginEl, 1);
      assert.lengthOf(links, 2);
    });

    it('should not render login and signup element if user is logged in', () => {
      const el = util.createDirective(document, 'loginControl', {
        auth: {
          username: 'someUsername',
          status: 'logged-in',
        },
        newStyle: true,
      });
      const loginEl = el.find('.login-text');
      assert.lengthOf(loginEl, 0);
    });
  });

  describe('user menu', () => {
    it('should render a user menu if the user is logged in', () => {
      const el = util.createDirective(document, 'loginControl', {
        auth: {
          username: 'someUsername',
          status: 'logged-in',
        },
        newStyle: true,
      });
      const menuEl = el.find('user-menu');
      assert.lengthOf(menuEl, 1);
    });
    it('should not render a user menu if user is not logged in', () => {
      const el = util.createDirective(document, 'loginControl', {
        auth: {
          username: 'someUsername',
          status: 'logged-out',
        },
        newStyle: true,
      });
      const menuEl = el.find('user-menu');
      assert.lengthOf(menuEl, 0);
    });
  });
});
