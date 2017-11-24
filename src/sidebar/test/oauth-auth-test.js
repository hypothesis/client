'use strict';

var angular = require('angular');
var { stringify } = require('query-string');

var events = require('../events');

var DEFAULT_TOKEN_EXPIRES_IN_SECS = 1000;
var TOKEN_KEY = 'hypothesis.oauth.hypothes%2Eis.token';

class FakeWindow {
  constructor() {
    this.callbacks = [];

    this.screen = {
      width: 1024,
      height: 768,
    };


    this.location = 'https://client.hypothes.is/app.html';
    this.open = sinon.spy(href => {
      var win = new FakeWindow;
      win.location = href;
      return win;
    });

    this.setTimeout = window.setTimeout.bind(window);
    this.clearTimeout = window.clearTimeout.bind(window);
  }

  get location() {
    return this.url;
  }

  set location(href) {
    this.url = new URL(href);
  }

  addEventListener(event, callback) {
    this.callbacks.push({event, callback});
  }

  removeEventListener(event, callback) {
    this.callbacks = this.callbacks.filter((cb) =>
      !(cb.event === event && cb.callback === callback)
    );
  }

  trigger(event) {
    this.callbacks.forEach((cb) => {
      if (cb.event === event.type) {
        cb.callback(event);
      }
    });
  }

  sendMessage(data) {
    var evt = new MessageEvent('message', { data });
    this.trigger(evt);
  }
}

describe('sidebar.oauth-auth', function () {

  var $rootScope;
  var auth;
  var nowStub;
  var fakeApiRoutes;
  var fakeHttp;
  var fakeFlash;
  var fakeLocalStorage;
  var fakeRandom;
  var fakeWindow;
  var fakeSettings;
  var clock;
  var successfulFirstAccessTokenPromise;

  /**
   * Login and retrieve an auth code.
   */
  function login() {
    var loggedIn = auth.login();
    fakeWindow.sendMessage({
      type: 'authorization_response',
      code: 'acode',
      state: 'notrandom',
    });
    return loggedIn;
  }

  before(() => {
    angular.module('app', [])
      .service('auth', require('../oauth-auth'));
  });

  beforeEach(function () {
    // Setup fake clock. This has to be done before setting up the `window`
    // fake which makes use of timers.
    clock = sinon.useFakeTimers();

    nowStub = sinon.stub(window.performance, 'now');
    nowStub.returns(300);

    successfulFirstAccessTokenPromise = Promise.resolve({
      status: 200,
      data: {
        access_token: 'firstAccessToken',
        expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
        refresh_token: 'firstRefreshToken',
      },
    });

    fakeHttp = {
      post: sinon.stub().returns(successfulFirstAccessTokenPromise),
    };

    fakeApiRoutes = {
      links: sinon.stub().returns(Promise.resolve({
        'oauth.authorize': 'https://hypothes.is/oauth/authorize/',
        'oauth.revoke': 'https://hypothes.is/oauth/revoke/',
      })),
    };

    fakeFlash = {
      error: sinon.stub(),
    };

    fakeRandom = {
      generateHexString: sinon.stub().returns('notrandom'),
    };

    fakeSettings = {
      apiUrl: 'https://hypothes.is/api/',
      oauthClientId: 'the-client-id',
      services: [{
        authority: 'publisher.org',
        grantToken: 'a.jwt.token',
      }],
    };

    fakeWindow = new FakeWindow();

    fakeLocalStorage = {
      getObject: sinon.stub().returns(null),
      setObject: sinon.stub(),
      removeItem: sinon.stub(),
    };

    angular.mock.module('app', {
      $http: fakeHttp,
      $window: fakeWindow,
      apiRoutes: fakeApiRoutes,
      flash: fakeFlash,
      localStorage: fakeLocalStorage,
      random: fakeRandom,
      settings: fakeSettings,
    });

    angular.mock.inject((_auth_, _$rootScope_) => {
      auth = _auth_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(function () {
    performance.now.restore();
    clock.restore();
  });

  describe('#tokenGetter', function () {
    it('exchanges the grant token for an access token if provided', function () {
      return auth.tokenGetter().then(function (token) {
        var expectedBody =
          'assertion=a.jwt.token' +
          '&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer';
        assert.calledWith(fakeHttp.post, 'https://hypothes.is/api/token', expectedBody, {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
        assert.equal(token, 'firstAccessToken');
      });
    });

    context('when the access token request fails', function() {
      beforeEach('make access token requests fail', function () {
        fakeHttp.post.returns(Promise.resolve({status: 500}));
      });

      function assertThatAccessTokenPromiseWasRejectedAnd(func) {
        return auth.tokenGetter().then(
          function onResolved () {
            assert(false, 'The Promise should have been rejected');
          },
          func
        );
      }

      it('shows an error message to the user', function () {
        return assertThatAccessTokenPromiseWasRejectedAnd(function () {
          assert.calledOnce(fakeFlash.error);
          assert.equal(
            fakeFlash.error.firstCall.args[0],
            'You must reload the page to annotate.'
          );
        });
      });

      it('returns a rejected promise', function () {
        return assertThatAccessTokenPromiseWasRejectedAnd(function(error) {
          assert.equal(error.message, 'Failed to retrieve access token');
        });
      });
    });

    it('should cache tokens for future use', function () {
      return auth.tokenGetter().then(function () {
        resetHttpSpy();
        return auth.tokenGetter();
      }).then(function (token) {
        assert.equal(token, 'firstAccessToken');
        assert.notCalled(fakeHttp.post);
      });
    });

    // If an access token request has already been made but is still in
    // flight when tokenGetter() is called again, then it should just return
    // the pending Promise for the first request again (and not send a second
    // concurrent HTTP request).
    it('should not make two concurrent access token requests', function () {
      var respond;
      fakeHttp.post.returns(new Promise(resolve => {
        respond = resolve;
      }));

      // The first time tokenGetter() is called it sends the access token HTTP
      // request and returns a Promise for the access token.
      var tokens = [auth.tokenGetter(), auth.tokenGetter()];

      assert.equal(fakeHttp.post.callCount, 1);

      // Resolve the initial request for an access token in exchange for a JWT.
      respond({
        status: 200,
        data: {
          access_token: 'foo',
          refresh_token: 'bar',
          expires_in: 3600,
        },
      });
      return Promise.all(tokens);
    });

    it('should not attempt to exchange a grant token if none was provided', function () {
      fakeSettings.services = [{ authority: 'publisher.org' }];
      return auth.tokenGetter().then(function (token) {
        assert.notCalled(fakeHttp.post);
        assert.equal(token, null);
      });
    });

    it('should refresh the access token if it expired', function () {
      function callTokenGetter () {
        var tokenPromise = auth.tokenGetter();

        fakeHttp.post.returns(Promise.resolve({
          status: 200,
          data: {
            access_token: 'secondAccessToken',
            expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
            refresh_token: 'secondRefreshToken',
          },
        }));

        return tokenPromise;
      }

      function assertRefreshTokenWasUsed (refreshToken) {
        return function() {
          var expectedBody =
            'grant_type=refresh_token&refresh_token=' + refreshToken;

          assert.calledWith(
            fakeHttp.post,
            'https://hypothes.is/api/token',
            expectedBody,
            {headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            });
        };
      }

      return callTokenGetter()
        .then(resetHttpSpy)
        .then(expireAccessToken)
        .then(() => auth.tokenGetter())
        .then(token => assert.equal(token, 'secondAccessToken'))
        .then(assertRefreshTokenWasUsed('firstRefreshToken'));
    });

    // It only sends one refresh request, even if tokenGetter() is called
    // multiple times and the refresh response hasn't come back yet.
    it('does not send more than one refresh request', function () {
      // Perform an initial token fetch which will exchange the JWT grant for an
      // access token.
      return auth.tokenGetter()
        .then(() => {
          // Expire the access token to trigger a refresh request on the next
          // token fetch.
          fakeHttp.post.reset();
          expireAccessToken();

          // Delay the response to the refresh request.
          var respond;
          fakeHttp.post.returns(new Promise(resolve => {
            respond = resolve;
          }));

          // Request an auth token multiple times.
          var tokens = Promise.all([auth.tokenGetter(), auth.tokenGetter()]);

          // Finally, respond to the refresh request.
          respond({ access_token: 'a_new_token', refresh_token: 'a_delayed_token', expires_in: 3600 });

          return tokens;
        })
        .then(() => {
          // Check that only one refresh request was made.
          assert.equal(fakeHttp.post.callCount, 1);
        });
    });

    context('when a refresh request fails', function() {
      beforeEach('make refresh token requests fail', function () {
        fakeHttp.post = function(url, queryString) {
          if (queryString.indexOf('refresh_token') !== -1) {
            return Promise.resolve({status: 500});
          }
          return Promise.resolve(successfulFirstAccessTokenPromise);
        };
      });

      it('logs the user out', function () {
        expireAccessToken();

        return auth.tokenGetter(token => {
          assert.equal(token, null);
        });
      });
    });

    [{
      // User is logged-in on the publisher's website.
      authority: 'publisher.org',
      grantToken: 'a.jwt.token',
      expectedToken: 'firstAccessToken',
    },{
      // User is anonymous on the publisher's website.
      authority: 'publisher.org',
      grantToken: null,
      expectedToken: null,
    }].forEach(({ authority, grantToken, expectedToken }) => {
      it('should not persist access tokens if a grant token was provided', () => {
        fakeSettings.services = [{ authority, grantToken }];
        return auth.tokenGetter().then(() => {
          assert.notCalled(fakeLocalStorage.setObject);
        });
      });

      it('should not read persisted access tokens if a grant token was set', () => {
        fakeSettings.services = [{ authority, grantToken }];
        return auth.tokenGetter().then(token => {
          assert.equal(token, expectedToken);
          assert.notCalled(fakeLocalStorage.getObject);
        });
      });
    });

    it('persists tokens retrieved via auth code exchanges to storage', () => {
      fakeSettings.services = [];

      return login().then(() => {
        return auth.tokenGetter();
      }).then(() => {
        assert.calledWith(fakeLocalStorage.setObject, TOKEN_KEY, {
          accessToken: 'firstAccessToken',
          refreshToken: 'firstRefreshToken',
          expiresAt: 990000,
        });
      });
    });

    function expireAndRefreshAccessToken() {
      fakeLocalStorage.setObject.reset();
      fakeHttp.post.returns(Promise.resolve({
        status: 200,
        data: {
          access_token: 'secondToken',
          expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
          refresh_token: 'secondRefreshToken',
        },
      }));
      expireAccessToken();
      return auth.tokenGetter();
    }

    it('persists refreshed tokens to storage', () => {
      fakeSettings.services = [];

      // 1. Perform initial token exchange.
      return login().then(() => {
        return auth.tokenGetter();
      }).then(() => {
        // 2. Refresh access token.
        return expireAndRefreshAccessToken();
      }).then(() => {
        // 3. Check that updated token was persisted to storage.
        assert.calledWith(fakeLocalStorage.setObject, TOKEN_KEY, {
          accessToken: 'secondToken',
          refreshToken: 'secondRefreshToken',
          expiresAt: 1990000,
        });
      });
    });

    it('does not persist refreshed tokens if the original token was temporary', () => {
      fakeSettings.services = [{ authority: 'publisher.org', grantToken: 'a.jwt.token' }];

      return auth.tokenGetter().then(() => {
        return expireAndRefreshAccessToken();
      }).then(() => {
        // Check that updated token was not persisted to storage.
        assert.notCalled(fakeLocalStorage.setObject);
      });
    });

    it('fetches and returns tokens from storage', () => {
      fakeSettings.services = [];
      fakeLocalStorage.getObject.withArgs(TOKEN_KEY).returns({
        accessToken: 'foo',
        refreshToken: 'bar',
        expiresAt: 123,
      });

      return auth.tokenGetter().then((token) => {
        assert.equal(token, 'foo');
      });
    });

    it('refreshes expired tokens loaded from storage', () => {
      fakeSettings.services = [];

      // Store an expired access token.
      clock.tick(200);
      fakeLocalStorage.getObject.withArgs(TOKEN_KEY).returns({
        accessToken: 'foo',
        refreshToken: 'bar',
        expiresAt: 123,
      });
      fakeHttp.post.returns(Promise.resolve({
        status: 200,
        data: {
          access_token: 'secondToken',
          expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
          refresh_token: 'secondRefreshToken',
        },
      }));

      // Fetch the token again from the service and check that it gets
      // refreshed.
      return auth.tokenGetter().then((token) => {
        assert.equal(token, 'secondToken');
        assert.calledWith(
          fakeLocalStorage.setObject,
          TOKEN_KEY,
          {
            accessToken: 'secondToken',
            refreshToken: 'secondRefreshToken',
            expiresAt: 990200,
          }
        );
      });
    });

    [{
      when: 'keys are missing',
      data: {
        accessToken: 'foo',
      },
    },{
      when: 'data types are wrong',
      data: {
        accessToken: 123,
        expiresAt: 'notanumber',
        refreshToken: null,
      },
    }].forEach(({ when, data }) => {
      context(when, () => {
        it('ignores invalid tokens in storage', () => {
          fakeSettings.services = [];
          fakeLocalStorage.getObject.withArgs('foo').returns(data);
          return auth.tokenGetter().then((token) => {
            assert.equal(token, null);
          });
        });
      });
    });
  });

  context('when another client instance saves new tokens', () => {
    beforeEach(() => {
      fakeSettings.services = [];
    });

    function notifyStoredTokenChange() {
      // Trigger "storage" event as if another client refreshed the token.
      var storageEvent = new Event('storage');
      storageEvent.key = TOKEN_KEY;

      fakeLocalStorage.getObject.returns({
        accessToken: 'storedAccessToken',
        refreshToken: 'storedRefreshToken',
        expiresAt: Date.now() + 100,
      });

      fakeWindow.trigger(storageEvent);
    }

    it('reloads tokens from storage', () => {
      return login().then(() => {
        return auth.tokenGetter();
      }).then(token => {
        assert.equal(token, 'firstAccessToken');

        notifyStoredTokenChange();

        return auth.tokenGetter();
      }).then(token => {
        assert.equal(token, 'storedAccessToken');
      });
    });

    it('notifies other services about the change', () => {
      var onTokenChange = sinon.stub();
      $rootScope.$on(events.OAUTH_TOKENS_CHANGED, onTokenChange);

      notifyStoredTokenChange();

      assert.called(onTokenChange);
    });
  });

  describe('#login', () => {
    beforeEach(() => {
      // login() is only currently used when using the public
      // Hypothesis service.
      fakeSettings.services = [];
    });

    it('opens the auth endpoint in a popup window', () => {
      auth.login();

      return fakeApiRoutes.links().then((links) => {
        var authUrl = links['oauth.authorize'];
        var params = {
          client_id: fakeSettings.oauthClientId,
          origin: 'https://client.hypothes.is',
          response_mode: 'web_message',
          response_type: 'code',
          state: 'notrandom',
        };
        var expectedAuthUrl = `${authUrl}?${stringify(params)}`;

        // Check that the auth window was opened and then set to the expected
        // location. The final URL is not passed to `window.open` to work around
        // a pop-up blocker issue.
        assert.calledWith(
          fakeWindow.open,
          'about:blank',
          'Login to Hypothesis',
          'height=430,left=274.5,top=169,width=475'
        );
        var authPopup = fakeWindow.open.returnValues[0];
        assert.equal(authPopup.location.href, expectedAuthUrl);
      });
    });

    it('ignores auth responses if the state does not match', () => {
      var loggedIn = false;

      auth.login().then(() => {
        loggedIn = true;
      });

      fakeWindow.sendMessage({
        // Successful response with wrong state
        type: 'authorization_response',
        code: 'acode',
        state: 'wrongstate',
      });

      return Promise.resolve().then(() => {
        assert.isFalse(loggedIn);
      });
    });

    it('resolves when auth completes successfully', () => {
      var loggedIn = auth.login();

      fakeWindow.sendMessage({
        // Successful response
        type: 'authorization_response',
        code: 'acode',
        state: 'notrandom',
      });

      // 1. Verify that login completes.
      return loggedIn.then(() => {
        return auth.tokenGetter();
      }).then(() => {
        // 2. Verify that auth code is exchanged for access & refresh tokens.
        var expectedBody =
          'client_id=the-client-id' +
          '&code=acode' +
          '&grant_type=authorization_code';
        assert.calledWith(fakeHttp.post, 'https://hypothes.is/api/token', expectedBody, {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
      });
    });

    it('rejects when auth is canceled', () => {
      var loggedIn = auth.login();

      fakeWindow.sendMessage({
        // Error response
        type: 'authorization_canceled',
        state: 'notrandom',
      });

      return loggedIn.catch((err) => {
        assert.equal(err.message, 'Authorization window was closed');
      });
    });

    it('rejects if auth code exchange fails', () => {
      var loggedIn = auth.login();

      // Successful response from authz popup.
      fakeWindow.sendMessage({
        type: 'authorization_response',
        code: 'acode',
        state: 'notrandom',
      });

      // Error response from auth code => token exchange.
      fakeHttp.post.returns(Promise.resolve({status: 400}));

      return loggedIn.catch(err => {
        assert.equal(err.message, 'Authorization code exchange failed');
      });
    });
  });

  describe('#logout', () => {
    beforeEach(() => {
      // logout() is only currently used when using the public
      // Hypothesis service.
      fakeSettings.services = [];

      return login().then(() => {
        return auth.tokenGetter();
      }).then(token => {
        assert.notEqual(token, null);

        fakeHttp.post.reset();
      });
    });

    it('forgets access tokens', () => {
      return auth.logout().then(() => {
        return auth.tokenGetter();
      }).then(token => {
        assert.equal(token, null);
      });
    });

    it('removes cached tokens', () => {
      return auth.logout().then(() => {
        assert.calledWith(fakeLocalStorage.removeItem, TOKEN_KEY);
      });
    });

    it('revokes tokens', () => {
      return auth.logout().then(() => {
        var expectedBody = 'token=firstAccessToken';
        assert.calledWith(fakeHttp.post, 'https://hypothes.is/oauth/revoke/', expectedBody, {
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        });
      });
    });
  });

  // Advance time forward so that any current access tokens will have expired.
  function expireAccessToken () {
    clock.tick(DEFAULT_TOKEN_EXPIRES_IN_SECS * 1000);
  }

  // Reset fakeHttp's spy history (.called, .callCount, etc).
  function resetHttpSpy () {
    fakeHttp.post.resetHistory();
  }
});
