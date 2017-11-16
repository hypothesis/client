'use strict';

var queryString = require('query-string');

var random = require('./random');

/**
 * Return a new TokenInfo object from the given tokenUrl endpoint response.
 * @param {Object} response - The HTTP response from a POST to the tokenUrl
 *                            endpoint (an Angular $http response object).
 * @returns {TokenInfo}
 */
function tokenInfoFrom(response) {
  var data = response.data;
  return {
    accessToken:  data.access_token,

    // Set the expiry date to some time slightly before that implied by
    // `expires_in` to account for the delay in the client receiving the
    // response.
    expiresAt: Date.now() + ((data.expires_in - 10) * 1000),

    refreshToken: data.refresh_token,
  };
}

function generateState() {
  return random.generateHexString(16);
}

/**
 * OAuthClient handles interaction with the annotation service's OAuth
 * endpoints.
 */
class OAuthClient {
  constructor($http, config) {
    this.$http = $http;

    this.clientId = config.clientId;
    this.tokenEndpoint = config.tokenEndpoint;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.revokeEndpoint = config.revokeEndpoint;

    // Test seam
    this.generateState = config.generateState || generateState;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  exchangeAuthCode(code) {
    var data = {
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code,
    };
    return this._formPost(this.tokenEndpoint, data).then((response) => {
      if (response.status !== 200) {
        throw new Error('Authorization code exchange failed');
      }
      return tokenInfoFrom(response);
    });
  }

  /**
   * Exchange a grant token for access and refresh tokens.
   *
   * See https://tools.ietf.org/html/rfc7523#section-4
   */
  exchangeGrantToken(token) {
    var data = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    };
    return this._formPost(this.tokenEndpoint, data).then(response => {
      if (response.status !== 200) {
        throw new Error('Failed to retrieve access token');
      }
      return tokenInfoFrom(response);
    });
  }

  /**
   * Refresh an access and refresh token pair.
   *
   * See https://tools.ietf.org/html/rfc6749#section-6
   */
  refreshToken(refreshToken) {
    var data = { grant_type: 'refresh_token', refresh_token: refreshToken };
    return this._formPost(this.tokenEndpoint, data).then((response) => {
      if (response.status !== 200) {
        throw new Error('Failed to refresh access token');
      }
      return tokenInfoFrom(response);
    });
  }

  /**
   * Revoke an access and refresh token pair.
   */
  revokeToken(accessToken) {
    return this._formPost(this.revokeEndpoint, { token: accessToken });
  }

  /**
   * Prompt the user for permission to access their data.
   *
   * Returns an authorization code which can be passed to `exchangeAuthCode`.
   */
  authorize($window) {
    // Random state string used to check that auth messages came from the popup
    // window that we opened.
    var state = this.generateState();

    // Promise which resolves or rejects when the user accepts or closes the
    // auth popup.
    var authResponse = new Promise((resolve, reject) => {
      function authRespListener(event) {
        if (typeof event.data !== 'object') {
          return;
        }

        if (event.data.state !== state) {
          // This message came from a different popup window.
          return;
        }

        if (event.data.type === 'authorization_response') {
          resolve(event.data);
        }
        if (event.data.type === 'authorization_canceled') {
          reject(new Error('Authorization window was closed'));
        }
        $window.removeEventListener('message', authRespListener);
      }
      $window.addEventListener('message', authRespListener);
    });

    // Authorize user and retrieve grant token

    // In Chrome & Firefox the sizes passed to `window.open` are used for the
    // viewport size. In Safari the size is used for the window size including
    // title bar etc. There is enough vertical space at the bottom to allow for
    // this.
    //
    // See https://bugs.webkit.org/show_bug.cgi?id=143678
    var width  = 475;
    var height = 430;
    var left   = $window.screen.width / 2 - width / 2;
    var top    = $window.screen.height /2 - height / 2;

    // Generate settings for `window.open` in the required comma-separated
    // key=value format.
    var authWindowSettings = queryString.stringify({
      left: left,
      top: top,
      width: width,
      height: height,
    }).replace(/&/g, ',');

    // Open the auth window before fetching the `oauth.authorize` URL to ensure
    // that the `window.open` call happens in the same turn of the event loop
    // that was initiated by the user clicking the "Log in" link.
    //
    // Otherwise the `window.open` call is not deemed to be in response to a
    // user gesture in Firefox & IE 11 and their popup blocking heuristics will
    // prevent the window being opened. See
    // https://github.com/hypothesis/client/issues/534 and
    // https://github.com/hypothesis/client/issues/535.
    //
    // Chrome, Safari & Edge have different heuristics and are not affected by
    // this problem.
    var authWindow = $window.open('about:blank', 'Login to Hypothesis', authWindowSettings);

    var authUrl = this.authorizationEndpoint;
    authUrl += '?' + queryString.stringify({
      client_id: this.clientId,
      origin: $window.location.origin,
      response_mode: 'web_message',
      response_type: 'code',
      state: state,
    });
    authWindow.location = authUrl;

    return authResponse.then(rsp => rsp.code);
  }

  /**
   * Make an `application/x-www-form-urlencoded` POST request.
   */
  _formPost(url, data) {
    data = queryString.stringify(data);
    var requestConfig = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    };
    return this.$http.post(url, data, requestConfig);
  }
}

module.exports = OAuthClient;
