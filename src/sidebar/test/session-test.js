'use strict';

var angular = require('angular');

var events = require('../events');

var mock = angular.mock;

describe('sidebar.session', function () {
  var $rootScope;

  var fakeAnalytics;
  var fakeAuth;
  var fakeFlash;
  var fakeRaven;
  var fakeServiceConfig;
  var fakeSettings;
  var fakeStore;
  var sandbox;
  var session;

  before(function () {
    angular.module('h', [])
      .service('session', require('../session'));
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    var state = {};
    fakeAnalytics = {
      track: sinon.stub(),
      events: require('../analytics')().events,
    };
    var fakeAnnotationUI = {
      getState: function () {
        return {session: state};
      },
      updateSession: function (session) {
        state = session;
      },
    };
    fakeAuth = {
      login: sandbox.stub().returns(Promise.resolve()),
    };
    fakeFlash = {error: sandbox.spy()};
    fakeRaven = {
      setUserInfo: sandbox.spy(),
    };
    fakeStore = {
      profile: {
        read: sandbox.stub(),
        update: sandbox.stub().returns(Promise.resolve({})),
      },
    };
    fakeServiceConfig = sinon.stub().returns(null);
    fakeSettings = {
      serviceUrl: 'https://test.hypothes.is/root/',
    };

    mock.module('h', {
      analytics: fakeAnalytics,
      annotationUI: fakeAnnotationUI,
      auth: fakeAuth,
      flash: fakeFlash,
      raven: fakeRaven,
      settings: fakeSettings,
      serviceConfig: fakeServiceConfig,
      store: fakeStore,
    });
  });


  beforeEach(mock.inject(function (_$rootScope_, _session_) {
    session = _session_;
    $rootScope = _$rootScope_;
  }));

  afterEach(function () {
    sandbox.restore();
  });

  describe('#load()', function () {
    context('when the host page provides an OAuth grant token', function () {
      beforeEach(function () {
        fakeServiceConfig.returns({
          authority: 'publisher.org',
          grantToken: 'a.jwt.token',
        });
        fakeStore.profile.read.returns(Promise.resolve({
          userid: 'acct:user@publisher.org',
        }));
      });

      it('should pass the "authority" param when fetching the profile', function () {
        return session.load().then(function () {
          assert.calledWith(fakeStore.profile.read, {authority: 'publisher.org'});
        });
      });

      it('should update the session with the profile data from the API', function () {
        return session.load().then(function () {
          assert.equal(session.state.userid, 'acct:user@publisher.org');
        });
      });
    });

    context('when using a first party account', () => {
      var clock;

      beforeEach(() => {
        fakeStore.profile.read.returns(Promise.resolve({
          userid: 'acct:user@hypothes.is',
        }));
      });

      afterEach(() => {
        if (clock) {
          clock.restore();
        }
      });

      it('should fetch profile data from the API', () => {
        return session.load().then(() => {
          assert.calledWith(fakeStore.profile.read);
        });
      });

      it('should retry the profile fetch if it fails', () => {
        fakeStore.profile.read.onCall(0).returns(
          Promise.reject(new Error('Server error'))
        );
        fakeStore.profile.read.onCall(1).returns(
          Promise.resolve({userid: 'acct:user@hypothes.is', groups: []})
        );

        // Shorten the delay before retrying the fetch.
        session.profileFetchRetryOpts.minTimeout = 50;

        return session.load().then(() => {
          assert.equal(session.state.userid, 'acct:user@hypothes.is');
        });
      });

      it('should update the session with the profile data from the API', () => {
        return session.load().then(function () {
          assert.equal(session.state.userid, 'acct:user@hypothes.is');
        });
      });

      it('should cache the returned profile data', () => {
        return session.load().then(() => {
          return session.load();
        }).then(() => {
          assert.calledOnce(fakeStore.profile.read);
        });
      });

      it('should eventually expire the cache', () => {
        clock = sinon.useFakeTimers();
        var CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        return session.load().then(() => {
          clock.tick(CACHE_TTL * 2);
          return session.load();
        }).then(() => {
          assert.calledTwice(fakeStore.profile.read);
        });
      });
    });
  });

  describe('#update()', function () {
    it('broadcasts GROUPS_CHANGED when the groups change', function () {
      var groupChangeCallback = sinon.stub();
      $rootScope.$on(events.GROUPS_CHANGED, groupChangeCallback);
      session.update({
        groups: [{
          id: 'groupid',
        }],
      });
      assert.calledOnce(groupChangeCallback);
    });

    it('broadcasts USER_CHANGED when the user changes', function () {
      var userChangeCallback = sinon.stub();
      $rootScope.$on(events.USER_CHANGED, userChangeCallback);
      session.update({
        userid: 'fred',
      });
      assert.calledOnce(userChangeCallback);
    });

    it('updates the user ID for Sentry error reports', function () {
      session.update({
        userid: 'anne',
      });
      assert.calledWith(fakeRaven.setUserInfo, {
        id: 'anne',
      });
    });
  });

  describe('#dismissSidebarTutorial()', function () {
    beforeEach(function () {
      fakeStore.profile.update.returns(Promise.resolve({
        preferences: {},
      }));
    });

    it('disables the tutorial for the user', function () {
      session.dismissSidebarTutorial();
      assert.calledWith(fakeStore.profile.update, {}, {preferences: {show_sidebar_tutorial: false}});
    });

    it('should update the session with the response from the API', function () {
      return session.dismissSidebarTutorial().then(function () {
        assert.isNotOk(session.state.preferences.show_sidebar_tutorial);
      });
    });
  });

  describe('#reload', () => {
    beforeEach(() => {
      // Load the initial profile data, as the client will do on startup.
      fakeStore.profile.read.returns(Promise.resolve({
        userid: 'acct:user_a@hypothes.is',
      }));
      return session.load();
    });

    it('should clear cached data and reload', () => {
      fakeStore.profile.read.returns(Promise.resolve({
        userid: 'acct:user_b@hypothes.is',
      }));

      return session.reload().then(() => {
        assert.equal(session.state.userid, 'acct:user_b@hypothes.is');
      });
    });
  });

  describe('#logout', function () {
    beforeEach(() => {
      var loggedIn = true;

      fakeAuth.logout = sinon.spy(() => {
        loggedIn = false;
        return Promise.resolve();
      });

      // Fake profile response after logout.
      fakeStore.profile.read = () => Promise.resolve({
        userid: null,
        loggedIn,
      });
    });

    it('logs the user out', () => {
      return session.logout().then(() => {
        assert.called(fakeAuth.logout);
      });
    });

    it('tracks successful logout actions in analytics', () => {
      return session.logout().then(() => {
        assert.calledWith(fakeAnalytics.track, fakeAnalytics.events.LOGOUT_SUCCESS);
      });
    });

    it('updates the profile after logging out', () => {
      return session.logout().then(() => {
        assert.isFalse(session.state.loggedIn);
      });
    });
  });

  context('when another client changes the current login', () => {
    it('reloads the profile', () => {
      fakeStore.profile.read.returns(Promise.resolve({
        userid: 'acct:initial_user@hypothes.is',
      }));

      return session.load().then(() => {

        // Simulate login change happening in a different tab.
        fakeStore.profile.read.returns(Promise.resolve({
          userid: 'acct:different_user@hypothes.is',
        }));
        $rootScope.$broadcast(events.OAUTH_TOKENS_CHANGED);

        return session.load();
      }).then(() => {
        assert.equal(session.state.userid, 'acct:different_user@hypothes.is');
      });
    });
  });
});
