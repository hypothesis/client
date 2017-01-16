'use strict';

var auth = require('../auth');

describe('auth', function () {
  var fakeHttp;
  var fakeJwtHelper;
  var fakeSettings;
  var fakeSession;
  var fakeTokens = ['token-one', 'token-two'];
  var fakeTokenIndex;

  beforeEach(function () {
    fakeTokenIndex = 0;
    fakeHttp = {
      defaults: {xsrfHeaderName: 'X-CSRF-Token'},
      get: sinon.spy(function (url, config) {
        assert.equal(config.skipAuthorization, true);
        assert.equal(url, 'https://test.hypothes.is/api/token');
        assert.deepEqual(config.headers, {
          'X-CSRF-Token': fakeSession.state.csrf,
        });

        var result = {status: 200, data: fakeTokens[fakeTokenIndex]};
        ++fakeTokenIndex;
        return Promise.resolve(result);
      }),
    };
    fakeJwtHelper = {isTokenExpired: sinon.stub()};
    fakeSession = {
      load: sinon.spy(function () {
        return Promise.resolve(fakeSession.state);
      }),
      logout: sinon.spy(function () {
        return {$promise: Promise.resolve()};
      }),
      state: {
        csrf: 'fake-csrf-token',
      },
    };
    fakeSettings = {
      apiUrl: 'https://test.hypothes.is/api/',
    };
  });

  function authFactory() {
    var fakeFlash = { error: sinon.stub() };
    return auth(fakeHttp, fakeFlash, fakeJwtHelper, fakeSession, fakeSettings);
  }

  describe('#tokenGetter', function () {

    it('should fetch and return a new token', function () {
      var auth = authFactory();
      return auth.tokenGetter().then(function (token) {
        assert.called(fakeHttp.get);
        assert.equal(token, fakeTokens[0]);
      });
    });

    it('should cache tokens for future use', function () {
      var auth = authFactory();
      return auth.tokenGetter().then(function () {
        return auth.tokenGetter();
      }).then(function (token) {
        assert.calledOnce(fakeHttp.get);
        assert.equal(token, fakeTokens[0]);
      });
    });

    it('should refresh expired tokens', function () {
      var auth = authFactory();
      return auth.tokenGetter().then(function () {
        fakeJwtHelper.isTokenExpired = function () {
          return true;
        };
        return auth.tokenGetter();
      }).then(function (token) {
        assert.calledTwice(fakeHttp.get);
        assert.equal(token, fakeTokens[1]);
      });
    });

    it('should fetch a new token if the userid changes', function () {
      var auth = authFactory();
      return auth.tokenGetter().then(function () {
        fakeSession.state.userid = 'new-user-id';
        return auth.tokenGetter();
      }).then(function (token) {
        assert.calledTwice(fakeHttp.get);
        assert.equal(token, fakeTokens[1]);
      });
    });
  });

  describe('#logout', function () {
    it('should call session.logout', function () {
      var auth = authFactory();
      return auth.logout().then(function () {
        assert.called(fakeSession.logout);
      });
    });
  });
});
