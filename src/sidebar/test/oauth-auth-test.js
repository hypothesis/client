'use strict';

var authService = require('../oauth-auth');

var DEFAULT_TOKEN_EXPIRES_IN_SECS = 1000;

describe('oauth auth', function () {

  var auth;
  var nowStub;
  var fakeHttp;
  var fakeFlash;
  var fakeSettings;
  var clock;
  var successfulFirstAccessTokenPromise;

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

    fakeSettings = {
      apiUrl: 'https://hypothes.is/api/',
      services: [{
        authority: 'publisher.org',
        grantToken: 'a.jwt.token',
      }],
    };

    auth = authService(fakeHttp, fakeFlash, fakeSettings);

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
      var auth = authService(fakeHttp, fakeFlash, {
        services: [{authority: 'publisher.org'}],
      });
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
        .then(expireAccessToken)
        .then(assertRefreshTokenWasUsed('firstRefreshToken'))
        .then(resetHttpSpy)
        .then(assertThatTokenGetterNowReturnsNewAccessToken)
        .then(expireAccessToken)
        .then(assertRefreshTokenWasUsed('secondRefreshToken'));
    });

    // While a refresh token HTTP request is in-flight, calls to tokenGetter()
    // should just return the old access token immediately.
    it('returns the access token while a refresh is in-flight', function() {
      return auth.tokenGetter().then(function(firstAccessToken) {
        makeServerUnresponsive();

        expireAccessToken();

        // The refresh token request will still be in-flight, but tokenGetter()
        // should still return a Promise for the old access token.
        return auth.tokenGetter().then(function(secondAccessToken) {
          assert.equal(firstAccessToken, secondAccessToken);
        });
      });
    });

    // It only sends one refresh request, even if tokenGetter() is called
    // multiple times and the refresh response hasn't come back yet.
    it('does not send more than one refresh request', function () {
      return auth.tokenGetter()
        .then(resetHttpSpy) // Reset fakeHttp.post.callCount to 0 so that the
                            // initial access token request isn't counted.
        .then(auth.tokenGetter)
        .then(makeServerUnresponsive)
        .then(auth.tokenGetter)
        .then(expireAccessToken)
        .then(function () {
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

      it('shows an error message to the user', function () {
        function assertThatErrorMessageWasShown() {
          assert.calledOnce(fakeFlash.error);
          assert.equal(
            fakeFlash.error.firstCall.args[0],
            'You must reload the page to continue annotating.'
          );
        }

        return auth.tokenGetter()
          .then(expireAccessToken)
          .then(function () { clock.tick(1); })
          .then(assertThatErrorMessageWasShown);
      });
    });
  });

  // Advance time forward so that any current access tokens will have expired.
  function expireAccessToken () {
    clock.tick(DEFAULT_TOKEN_EXPIRES_IN_SECS * 1000);
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
