'use strict';

var { stringify } = require('query-string');
var sinon = require('sinon');

var OAuthClient = require('../oauth-client');
var FakeWindow = require('./fake-window');

var fixtures = {
  tokenResponse: {
    status: 200,
    data: {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 360,
    },
  },

  parsedToken: {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',

    // This assumes the `tokenResponse` above was received when
    // `Date.now() === 0`.
    expiresAt: 350000,
  },

  formPostParams: {
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  },
};

describe('sidebar.util.oauth-client', () => {
  var fakeHttp;
  var client;
  var clock;
  var config = {
    clientId: '1234-5678',
    authorizationEndpoint: 'https://annota.te/oauth/authorize',
    tokenEndpoint: 'https://annota.te/api/token',
    revokeEndpoint: 'https://annota.te/oauth/revoke',
    generateState: () => 'notrandom',
  };

  beforeEach(() => {
    fakeHttp = {
      post: sinon.stub().returns(Promise.resolve({status: 200})),
    };
    clock = sinon.useFakeTimers();

    client = new OAuthClient(fakeHttp, config);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('#exchangeAuthCode', () => {
    it('makes a POST request to the authorization endpoint', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));
      return client.exchangeAuthCode('letmein').then(() => {
        var expectedBody = 'client_id=1234-5678&code=letmein&grant_type=authorization_code';
        assert.calledWith(fakeHttp.post, 'https://annota.te/api/token', expectedBody, fixtures.formPostParams);
      });
    });

    it('resolves with the parsed token data', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));
      return client.exchangeAuthCode('letmein').then(token => {
        assert.deepEqual(token, fixtures.parsedToken);
      });
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.exchangeAuthCode('unknowncode').catch(err => {
        assert.equal(err.message, 'Authorization code exchange failed');
      });
    });
  });

  describe('#exchangeGrantToken', () => {
    it('makes a POST request to the token endpoint', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));
      return client.exchangeGrantToken('letmein').then(() => {
        var expectedBody =
          'assertion=letmein' +
          '&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer';
        assert.calledWith(fakeHttp.post, 'https://annota.te/api/token', expectedBody, fixtures.formPostParams);
      });
    });

    it('resolves with the parsed token data', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));

      return client.exchangeGrantToken('letmein').then(token => {
        assert.deepEqual(token, fixtures.parsedToken);
      });
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.exchangeGrantToken('unknowntoken').catch(err => {
        assert.equal(err.message, 'Failed to retrieve access token');
      });
    });
  });

  describe('#refreshToken', () => {
    it('makes a POST request to the token endpoint', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));

      return client.refreshToken('valid-refresh-token').then(() => {
        var expectedBody =
          'grant_type=refresh_token&refresh_token=valid-refresh-token';

        assert.calledWith(
          fakeHttp.post,
          'https://annota.te/api/token',
          expectedBody,
          fixtures.formPostParams
        );
      });
    });

    it('resolves with the parsed token data', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));

      return client.refreshToken('valid-refresh-token').then(token => {
        assert.deepEqual(token, fixtures.parsedToken);
      });
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.refreshToken('invalid-token').catch(err => {
        assert.equal(err.message, 'Failed to refresh access token');
      });
    });
  });

  describe('#revokeToken', () => {
    it('makes a POST request to the revoke endpoint', () => {
      fakeHttp.post.returns(Promise.resolve(fixtures.tokenResponse));

      return client.revokeToken('valid-access-token').then(() => {
        var expectedBody = 'token=valid-access-token';
        assert.calledWith(fakeHttp.post, 'https://annota.te/oauth/revoke', expectedBody, fixtures.formPostParams);
      });
    });

    it('resolves if the request succeeds', () => {
      fakeHttp.post.returns(Promise.resolve({status: 200}));
      return client.revokeToken('valid-access-token');
    });

    it('rejects if the request fails', () => {
      fakeHttp.post.returns(Promise.resolve({status: 400}));
      return client.revokeToken('invalid-token').catch(err => {
        assert.equal(err.message, 'failed');
      });
    });
  });

  describe('#authorize', () => {
    var fakeWindow;

    beforeEach(() => {
      fakeWindow = new FakeWindow;
    });

    it('opens a popup window at the authorization URL', () => {
      var authorized = client.authorize(fakeWindow);

      fakeWindow.sendMessage({
        type: 'authorization_response',
        code: 'expected-code',
        state: 'notrandom',
      });

      return authorized.then(() => {
        var params = {
          client_id: config.clientId,
          origin: 'https://client.hypothes.is',
          response_mode: 'web_message',
          response_type: 'code',
          state: 'notrandom',
        };
        var expectedAuthUrl = `${config.authorizationEndpoint}?${stringify(params)}`;
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

    it('resolves with an auth code if successful', () => {
      var authorized = client.authorize(fakeWindow);

      fakeWindow.sendMessage({
        type: 'authorization_response',
        code: 'expected-code',
        state: 'notrandom',
      });

      return authorized.then(code => {
        assert.equal(code, 'expected-code');
      });
    });

    it('rejects with an error if canceled', () => {
      var authorized = client.authorize(fakeWindow);

      fakeWindow.sendMessage({
        type: 'authorization_canceled',
        state: 'notrandom',
      });

      return authorized.catch(err => {
        assert.equal(err.message, 'Authorization window was closed');
      });
    });

    it('ignores responses with incorrect "state" values', () => {
      var authorized = client.authorize(fakeWindow);

      fakeWindow.sendMessage({
        type: 'authorization_response',
        code: 'first-code',
        state: 'wrongstate',
      });

      fakeWindow.sendMessage({
        type: 'authorization_response',
        code: 'second-code',
        state: 'notrandom',
      });

      return authorized.then(code => {
        assert.equal(code, 'second-code');
      });
    });
  });
});
