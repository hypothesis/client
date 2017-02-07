'use strict';

var authService = require('../oauth-auth');

var DEFAULT_TOKEN_EXPIRES_IN_SECS = 1000;

describe('oauth auth', function () {

  var auth;
  var nowStub;
  var fakeHttp;
  var fakeSettings;
  var clock;

  beforeEach(function () {
    nowStub = sinon.stub(window.performance, 'now');
    nowStub.returns(300);

    fakeHttp = {
      post: sinon.stub().returns(Promise.resolve({
        status: 200,
        data: {
          access_token: 'first_access_token',
          expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
          refresh_token: 'first_refresh_token',
        },
      })),
    };

    fakeSettings = {
      apiUrl: 'https://hypothes.is/api/',
      services: [{
        authority: 'publisher.org',
        grantToken: 'a.jwt.token',
      }],
    };

    auth = authService(fakeHttp, fakeSettings);

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
        assert.equal(token, 'first_access_token');
      });
    });

    it('should raise if a grant token request fails', function () {
      fakeHttp.post.returns(Promise.resolve({status: 500}));
      return auth.tokenGetter().then(
        function onResolved () {
          assert(false, 'The Promise should have been rejected');
        },
        function onRejected (error) {
          assert.equal(error.message, 'Failed to retrieve access token');
        }
      );
    });

    it('should cache tokens for future use', function () {
      return auth.tokenGetter().then(function () {
        fakeHttp.post.reset();
        return auth.tokenGetter();
      }).then(function (token) {
        assert.equal(token, 'first_access_token');
        assert.notCalled(fakeHttp.post);
      });
    });

    it('should return null if no grant token was provided', function () {
      var auth = authService(fakeHttp, {
        services: [{authority: 'publisher.org'}],
      });
      return auth.tokenGetter().then(function (token) {
        assert.notCalled(fakeHttp.post);
        assert.equal(token, null);
      });
    });

    // If an access token request has already been made but is still in
    // flight when tokenGetter() is called again, then it should just return
    // the pending Promise for the first request again (and not send a second
    // concurrent HTTP request).
    it('should not make two concurrent access token requests', function () {
      // Make $http.post() return a pending Promise (simulates an in-flight
      // HTTP request).
      fakeHttp.post.returns(new Promise(function() {}));

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

    it('should refresh the access token before it expires', function () {
      // Get the first access token (and refresh token).
      var tokenPromise = function() {
        var tokenPromise = auth.tokenGetter();

        fakeHttp.post.reset();

        fakeHttp.post.returns(Promise.resolve({
          status: 200,
          data: {
            access_token: 'second_access_token',
            expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
            refresh_token: 'second_refresh_token',
          },
        }));

        return tokenPromise;
      };

      // Advance time forward so that the current access token expires.
      var expireAccessToken = function() {
        clock.tick(DEFAULT_TOKEN_EXPIRES_IN_SECS * 1000);
      };

      // Assert that a correct refresh token request has been made using the
      // given refresh token.
      var assertRefreshTokenWasUsed = function(refreshToken) {
        return function() {
          var expectedBody =
            'grant_type=refresh_token&refresh_token=' + refreshToken;

          assert.calledWith(
            fakeHttp.post,
            'https://hypothes.is/api/token',
            expectedBody,
            {headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          });

          // Make sure that only one refresh request was sent.
          assert.equal(fakeHttp.post.callCount, 1)

          fakeHttp.post.reset();
        };
      };

      // Assert that tokenGetter() now returns the *new* access token.
      var assertThatTokenGetterNowReturnsNewAccessToken = function () {
        return auth.tokenGetter().then(function (token) {
          assert.equal(token, 'second_access_token');
        });
      };

      return tokenPromise()
        .then(expireAccessToken)
        .then(assertRefreshTokenWasUsed('first_refresh_token'))
        .then(assertThatTokenGetterNowReturnsNewAccessToken)
        .then(expireAccessToken)
        .then(assertRefreshTokenWasUsed('second_refresh_token'));
    });

    // While a refresh token HTTP request is in-flight, calls to tokenGetter()
    // should just return the old access token immediately.
    it('returns the access token while a refresh is in-flight', function() {
      return auth.tokenGetter().then(function(first_access_token) {
        // Make $http.post() return a pending Promise (simulates a still
        // in-flight HTTP request).
        fakeHttp.post.returns(new Promise(function () {}));

        // Move forward in time so that the current access token expires and
        // a refresh token request is sent.
        clock.tick(DEFAULT_TOKEN_EXPIRES_IN_SECS * 1000);

        // The refresh token request will still be in-flight, but tokenGetter()
        // should still return a Promise for the old access token.
        return auth.tokenGetter().then(function(second_access_token) {
          assert.equal(first_access_token, second_access_token);
        })
      });
    });
  });

  describe('#clearCache', function () {
    it('should clear cached tokens', function () {
      return auth.tokenGetter().then(function () {
        fakeHttp.post.reset();
        auth.clearCache();
        return auth.tokenGetter();
      }).then(function () {
        assert.calledOnce(fakeHttp.post);
      });
    });
  });
});
