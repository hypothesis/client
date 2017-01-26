'use strict';

var auth = require('../auth');

describe('auth', function () {
  var fakeHttp;
  var fakeJwtHelper;
  var fakeSettings;
  var fakeTokens = ['token-one', 'token-two'];
  var fakeTokenIndex;

  beforeEach(function () {
    fakeTokenIndex = 0;
    fakeHttp = {
      get: sinon.spy(function (url, config) {
        assert.equal(url, 'https://test.hypothes.is/api/token');
        assert.deepEqual(config, {});

        var result = {status: 200, data: fakeTokens[fakeTokenIndex]};
        ++fakeTokenIndex;
        return Promise.resolve(result);
      }),
    };
    fakeJwtHelper = {isTokenExpired: sinon.stub()};
    fakeSettings = {
      apiUrl: 'https://test.hypothes.is/api/',
    };
  });

  function authFactory() {
    return auth(fakeHttp, fakeJwtHelper, fakeSettings);
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
  });

  describe('#clearCache', function () {
    it('should remove existing cached tokens', function () {
      var auth = authFactory();
      return auth.tokenGetter().then(function () {
        auth.clearCache();
        return auth.tokenGetter();
      }).then(function (token) {
        assert.calledTwice(fakeHttp.get);
        assert.equal(token, fakeTokens[1]);
      });
    });
  });
});
