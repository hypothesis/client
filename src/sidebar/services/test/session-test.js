import EventEmitter from 'tiny-emitter';

import { events as analyticsEvents } from '../analytics';
import sessionFactory from '../session';
import { $imports } from '../session';
import { Injector } from '../../../shared/injector';

describe('sidebar/services/session', function () {
  let fakeAnalytics;
  let fakeAuth;
  let fakeSentry;
  let fakeServiceConfig;
  let fakeSettings;
  let fakeStore;
  let fakeToastMessenger;
  let fakeApi;
  let sandbox;

  // The instance of the `session` service.
  let session;

  beforeEach(function () {
    sandbox = sinon.createSandbox();

    let currentProfile = {
      userid: null,
    };

    fakeAnalytics = {
      track: sinon.stub(),
      events: analyticsEvents,
    };
    fakeStore = {
      profile: sinon.stub().returns(currentProfile),
      updateProfile: sinon.stub().callsFake(newProfile => {
        currentProfile = newProfile;
      }),
    };
    fakeAuth = Object.assign(new EventEmitter(), {
      login: sandbox.stub().returns(Promise.resolve()),
      logout: sinon.stub().resolves(),
    });
    fakeSentry = {
      setUserInfo: sandbox.spy(),
    };
    fakeApi = {
      profile: {
        read: sandbox.stub().resolves(),
        update: sandbox.stub().resolves({}),
      },
    };
    fakeServiceConfig = sinon.stub().returns(null);
    fakeSettings = {
      serviceUrl: 'https://test.hypothes.is/root/',
    };
    fakeToastMessenger = { error: sandbox.spy() };

    $imports.$mock({
      '../service-config': fakeServiceConfig,
      '../util/sentry': fakeSentry,
    });

    session = new Injector()
      .register('analytics', { value: fakeAnalytics })
      .register('store', { value: fakeStore })
      .register('api', { value: fakeApi })
      .register('auth', { value: fakeAuth })
      .register('settings', { value: fakeSettings })
      .register('session', sessionFactory)
      .register('toastMessenger', { value: fakeToastMessenger })
      .get('session');
  });

  afterEach(function () {
    $imports.$restore();
    sandbox.restore();
  });

  describe('#load()', function () {
    context('when the host page provides an OAuth grant token', function () {
      beforeEach(function () {
        fakeServiceConfig.returns({
          authority: 'publisher.org',
          grantToken: 'a.jwt.token',
        });
        fakeApi.profile.read.returns(
          Promise.resolve({
            userid: 'acct:user@publisher.org',
          })
        );
      });

      it('should pass the "authority" param when fetching the profile', function () {
        return session.load().then(function () {
          assert.calledWith(fakeApi.profile.read, {
            authority: 'publisher.org',
          });
        });
      });

      it('should update the session with the profile data from the API', function () {
        return session.load().then(function () {
          assert.calledWith(fakeStore.updateProfile, {
            userid: 'acct:user@publisher.org',
          });
        });
      });
    });

    context('when using a first party account', () => {
      let clock;

      beforeEach(() => {
        fakeApi.profile.read.returns(
          Promise.resolve({
            userid: 'acct:user@hypothes.is',
          })
        );
      });

      afterEach(() => {
        if (clock) {
          clock.restore();
        }
      });

      it('should fetch profile data from the API', () => {
        return session.load().then(() => {
          assert.calledWith(fakeApi.profile.read);
        });
      });

      it('should retry the profile fetch if it fails', () => {
        const fetchedProfile = {
          userid: 'acct:user@hypothes.is',
          groups: [],
        };

        fakeApi.profile.read
          .onCall(0)
          .returns(Promise.reject(new Error('Server error')));
        fakeApi.profile.read.onCall(1).returns(Promise.resolve(fetchedProfile));

        // Shorten the delay before retrying the fetch.
        session.profileFetchRetryOpts.minTimeout = 50;

        return session.load().then(() => {
          assert.calledOnce(fakeStore.updateProfile);
          assert.calledWith(fakeStore.updateProfile, fetchedProfile);
        });
      });

      it('should update the session with the profile data from the API', () => {
        return session.load().then(function () {
          assert.calledOnce(fakeStore.updateProfile);
          assert.calledWith(fakeStore.updateProfile, {
            userid: 'acct:user@hypothes.is',
          });
        });
      });

      it('should cache the returned profile data', () => {
        return session
          .load()
          .then(() => {
            return session.load();
          })
          .then(() => {
            assert.calledOnce(fakeApi.profile.read);
          });
      });

      it('should eventually expire the cache', () => {
        clock = sinon.useFakeTimers();
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        return session
          .load()
          .then(() => {
            clock.tick(CACHE_TTL * 2);
            return session.load();
          })
          .then(() => {
            assert.calledTwice(fakeApi.profile.read);
          });
      });
    });
  });

  describe('#update()', function () {
    it('updates the user ID for Sentry error reports', function () {
      session.update({
        userid: 'anne',
      });
      assert.calledWith(fakeSentry.setUserInfo, {
        id: 'anne',
      });
    });
  });

  describe('#dismissSidebarTutorial()', function () {
    beforeEach(function () {
      fakeApi.profile.update.returns(
        Promise.resolve({
          preferences: {},
        })
      );
    });

    it('disables the tutorial for the user', function () {
      session.dismissSidebarTutorial();
      assert.calledWith(
        fakeApi.profile.update,
        {},
        { preferences: { show_sidebar_tutorial: false } }
      );
    });

    it('should update the session with the response from the API', function () {
      return session.dismissSidebarTutorial().then(function () {
        assert.calledOnce(fakeStore.updateProfile);
        assert.calledWith(fakeStore.updateProfile, {
          preferences: {},
        });
      });
    });
  });

  describe('#reload', () => {
    beforeEach(() => {
      // Load the initial profile data, as the client will do on startup.
      fakeApi.profile.read.returns(
        Promise.resolve({
          userid: 'acct:user_a@hypothes.is',
        })
      );
      return session.load();
    });

    it('should clear cached data and reload', () => {
      fakeApi.profile.read.returns(
        Promise.resolve({
          userid: 'acct:user_b@hypothes.is',
        })
      );

      fakeStore.updateProfile.resetHistory();

      return session.reload().then(() => {
        assert.calledOnce(fakeStore.updateProfile);
        assert.calledWith(fakeStore.updateProfile, {
          userid: 'acct:user_b@hypothes.is',
        });
      });
    });
  });

  describe('#logout', function () {
    const loggedOutProfile = {
      userid: null,

      // Dummy value used to differentiate this object from the default
      // value of `store.profile()`.
      isLoggedOutProfile: true,
    };

    beforeEach(() => {
      fakeApi.profile.read.resolves(loggedOutProfile);
    });

    it('logs the user out', () => {
      return session.logout().then(() => {
        assert.called(fakeAuth.logout);
      });
    });

    it('tracks successful logout actions in analytics', () => {
      return session.logout().then(() => {
        assert.calledWith(
          fakeAnalytics.track,
          fakeAnalytics.events.LOGOUT_SUCCESS
        );
      });
    });

    it('updates the profile after logging out', () => {
      return session.logout().then(() => {
        assert.calledOnce(fakeStore.updateProfile);
        assert.calledWith(fakeStore.updateProfile, loggedOutProfile);
      });
    });

    it('displays an error if logging out fails', async () => {
      fakeAuth.logout.rejects(new Error('Could not revoke token'));
      try {
        await session.logout();
      } catch (e) {
        // Ignored.
      }
      assert.calledWith(fakeToastMessenger.error, 'Log out failed');
    });
  });

  context('when another client changes the current login', () => {
    it('reloads the profile', () => {
      fakeApi.profile.read.returns(
        Promise.resolve({
          userid: 'acct:initial_user@hypothes.is',
        })
      );

      return session
        .load()
        .then(() => {
          // Simulate login change happening in a different tab.
          fakeApi.profile.read.returns(
            Promise.resolve({
              userid: 'acct:different_user@hypothes.is',
            })
          );
          fakeAuth.emit('oauthTokensChanged');

          fakeStore.updateProfile.resetHistory();
          return session.load();
        })
        .then(() => {
          assert.calledOnce(fakeStore.updateProfile);
          assert.calledWith(fakeStore.updateProfile, {
            userid: 'acct:different_user@hypothes.is',
          });
        });
    });
  });

  // nb. This is a legacy property that should be removed.
  describe('#state', () => {
    it('returns the profile data', () => {
      assert.equal(session.state, fakeStore.profile());
    });
  });
});
