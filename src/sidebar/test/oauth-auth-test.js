'use strict';

var angular = require('angular');
var { stringify } = require('query-string');

var events = require('../events');

var DEFAULT_TOKEN_EXPIRES_IN_SECS = 1000;
var TOKEN_KEY = 'hypothesis.oauth.hypothes%2Eis.token';

class FakeWindow {
  constructor() {
    this.callbacks = [];

    this.location = {
      origin: 'client.hypothes.is',
    };

    this.screen = {
      width: 1024,
      height: 768,
    };

    this.open = sinon.stub();
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
  var fakeHttp;
  var fakeFlash;
  var fakeLocalStorage;
  var fakeMutex;
  var fakeRandom;
  var fakeWindow;
  var fakeSettings;
  var clock;
  var successfulFirstAccessTokenPromise;

  before(() => {
    angular.module('app', [])
      .service('auth', require('../oauth-auth'));
  });

  beforeEach(function () {
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

    fakeFlash = {
      error: sinon.stub(),
    };

    fakeMutex = {
      lock: () => Promise.resolve(),
      unlock: sinon.stub(),
    };

    fakeRandom = {
      generateHexString: sinon.stub().returns('notrandom'),
    };

    fakeSettings = {
      apiUrl: 'https://hypothes.is/api/',
      oauthAuthorizeUrl: 'https://hypothes.is/oauth/authorize/',
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
    };

    angular.mock.module('app', {
      $http: fakeHttp,
      $window: fakeWindow,
      flash: fakeFlash,
      localStorage: fakeLocalStorage,
      mutex: fakeMutex,
      random: fakeRandom,
      settings: fakeSettings,
    });

    angular.mock.inject((_auth_, _$rootScope_) => {
      auth = _auth_;
      $rootScope = _$rootScope_;
    });

    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    performance.now.restore();
    clock.restore();
  });

  describe('#tokenGetter', function () {
    it('should request an access token if a grant token was provided', function () {
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

    it('should not persist access tokens fetched using a grant token', function () {
      return auth.tokenGetter().then(() => {
        assert.notCalled(fakeLocalStorage.setObject);
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
      makeServerUnresponsive();

      // The first time tokenGetter() is called it sends the access token HTTP
      // request and returns a Promise for the access token.
      var firstAccessTokenPromise = auth.tokenGetter();

      // No matter how many times it's called while there's an HTTP request
      // in-flight, tokenGetter() never sends a second concurrent HTTP request.
      auth.tokenGetter();
      auth.tokenGetter();

      // It just keeps on returning the same Promise for the access token.
      var accessTokenPromise = auth.tokenGetter();

      assert.strictEqual(accessTokenPromise, firstAccessTokenPromise);
      assert.equal(fakeHttp.post.callCount, 1);
    });

    it('should return null if no grant token was provided', function () {
      fakeSettings.services = [{ authority: 'publisher.org' }];
      return auth.tokenGetter().then(function (token) {
        assert.notCalled(fakeHttp.post);
        assert.equal(token, null);
      });
    });

    it('should refresh the access token before it expires', function () {
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

      function assertThatTokenGetterNowReturnsNewAccessToken () {
        return auth.tokenGetter().then(function (token) {
          assert.equal(token, 'secondAccessToken');
        });
      }

      return callTokenGetter()
        .then(resetHttpSpy)
        .then(expireAndRefreshAccessToken)
        .then(assertRefreshTokenWasUsed('firstRefreshToken'))
        .then(resetHttpSpy)
        .then(assertThatTokenGetterNowReturnsNewAccessToken)
        .then(expireAndRefreshAccessToken)
        .then(assertRefreshTokenWasUsed('secondRefreshToken'));
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

      it('shows an error message to the user', function () {
        function assertThatErrorMessageWasShown() {
          assert.calledOnce(fakeFlash.error);
          assert.equal(
            fakeFlash.error.firstCall.args[0],
            'You must reload the page to continue annotating.'
          );
        }

        return auth.tokenGetter()
          .then(expireAndRefreshAccessToken)
          .then(function () { clock.tick(1); })
          .then(assertThatErrorMessageWasShown);
      });
    });
  });

  describe('persistence of tokens to storage', () => {
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

    beforeEach(() => {
      fakeSettings.services = [];
    });

    it('persists tokens retrieved via auth code exchanges to storage', () => {
      return login().then(() => {
        return auth.tokenGetter();
      }).then(() => {
        assert.calledWith(fakeLocalStorage.setObject, TOKEN_KEY, {
          accessToken: 'firstAccessToken',
          refreshToken: 'firstRefreshToken',
          expiresAt: 910000,
        });
      });
    });

    it('persists refreshed tokens to storage', () => {
      // 1. Perform initial token exchange.
      return login().then(() => {
        return auth.tokenGetter();
      }).then(() => {
        // 2. Refresh access token.
        fakeLocalStorage.setObject.reset();
        fakeHttp.post.returns(Promise.resolve({
          status: 200,
          data: {
            access_token: 'secondToken',
            expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
            refresh_token: 'secondRefreshToken',
          },
        }));
        expireAndRefreshAccessToken();
        return auth.tokenGetter();
      }).then(() => {
        // 3. Check that updated token was persisted to storage.
        assert.calledWith(fakeLocalStorage.setObject, TOKEN_KEY, {
          accessToken: 'secondToken',
          refreshToken: 'secondRefreshToken',
          expiresAt: 1910000,
        });
      });
    });

    it('loads and uses tokens from storage', () => {
      fakeLocalStorage.getObject.withArgs(TOKEN_KEY).returns({
        accessToken: 'foo',
        refreshToken: 'bar',
        expiresAt: 123,
      });

      return auth.tokenGetter().then((token) => {
        assert.equal(token, 'foo');
      });
    });

    it('refreshes the token if it expired after loading from storage', () => {
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
            expiresAt: 910200,
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
          fakeLocalStorage.getObject.withArgs('foo').returns(data);
          return auth.tokenGetter().then((token) => {
            assert.equal(token, null);
          });
        });
      });
    });

    context('when another client instance saves new tokens', () => {
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
  });

  describe('#login', () => {

    beforeEach(() => {
      // login() is only currently used when using the public
      // Hypothesis service.
      fakeSettings.services = [];
    });

    it('opens the auth endpoint in a popup window', () => {
      auth.login();

      var params = {
        client_id: fakeSettings.oauthClientId,
        origin: 'client.hypothes.is',
        response_mode: 'web_message',
        response_type: 'code',
        state: 'notrandom',
      };
      var expectedAuthUrl = `${fakeSettings.oauthAuthorizeUrl}?${stringify(params)}`;
      assert.calledWith(
        fakeWindow.open,
        expectedAuthUrl,
        'Login to Hypothesis',
        'height=400,left=312,top=184,width=400'
      );
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

  // Advance time forward so that any current access tokens will have expired.
  function expireAndRefreshAccessToken () {
    clock.tick(DEFAULT_TOKEN_EXPIRES_IN_SECS * 1000);

    // Wait for token refresh to complete.
    return auth.tokenGetter();
  }

  // Make $http.post() return a pending Promise (simulates a still in-flight
  // HTTP request).
  function makeServerUnresponsive () {
    fakeHttp.post.returns(new Promise(function () {}));
  }

  // Reset fakeHttp's spy history (.called, .callCount, etc).
  function resetHttpSpy () {
    fakeHttp.post.resetHistory();
  }
});
