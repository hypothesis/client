'use strict';

var authService = require('../oauth-auth');

var DEFAULT_TOKEN_EXPIRES_IN_SECS = 1000;

describe('oauth auth', function () {

  var auth;
  var nowStub;
  var fakeHttp;
  var fakeSettings;

  beforeEach(function () {
    nowStub = sinon.stub(window.performance, 'now');
    nowStub.returns(300);

    fakeHttp = {
      post: sinon.stub().returns(Promise.resolve({
        status: 200,
        data: {
          access_token: 'an-access-token',
          expires_in: DEFAULT_TOKEN_EXPIRES_IN_SECS,
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
  });

  afterEach(function () {
    performance.now.restore();
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
        assert.equal(token, 'an-access-token');
      });
    });

    it('should raise if an access token request fails', function () {
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
        assert.equal(token, 'an-access-token');
        assert.notCalled(fakeHttp.post);
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

    it('should return null if no grant token was provided', function () {
      var auth = authService(fakeHttp, {
        services: [{authority: 'publisher.org'}],
      });
      return auth.tokenGetter().then(function (token) {
        assert.notCalled(fakeHttp.post);
        assert.equal(token, null);
      });
    });
  });
});
