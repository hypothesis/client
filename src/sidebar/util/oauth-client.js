'use strict';

const queryString = require('query-string');

const random = require('./random');

/**
 * An object holding the details of an access token from the tokenUrl endpoint.
 * @typedef {Object} TokenInfo
 * @property {string} accessToken  - The access token itself.
 * @property {number} expiresAt    - The date when the timestamp will expire.
 * @property {string} refreshToken - The refresh token that can be used to
 *                                   get a new access token.
 */

/**
 * Return a new TokenInfo object from the given tokenUrl endpoint response.
 * @param {Response} response - The HTTP response from a POST to the tokenUrl
 *                            endpoint.
 * @returns {Promise<TokenInfo>}
 */
function tokenInfoFrom(response) {
  return response.json().then(data => {
    return {
      accessToken: data.access_token,

      // Set the expiry date to some time slightly before that implied by
      // `expires_in` to account for the delay in the client receiving the
      // response.
      expiresAt: Date.now() + (data.expires_in - 10) * 1000,

      refreshToken: data.refresh_token,
    };
  });
}

/**
 * Generate a short random string suitable for use as the "state" param in
 * authorization requests.
 *
 * See https://tools.ietf.org/html/rfc6749#section-4.1.1.
 */
function generateState() {
  return random.generateHexString(16);
}

/**
 * OAuthClient configuration.
 *
 * @typedef {Object} Config
 * @property {string} clientId - OAuth client ID
 * @property {string} tokenEndpoint - OAuth token exchange/refresh endpoint
 * @property {string} authorizationEndpoint - OAuth authorization endpoint
 * @property {string} revokeEndpoint - RFC 7009 token revocation endpoint
 * @property {() => string} [generateState] - Authorization "state" parameter generator
 */

/**
 * OAuthClient handles interaction with the annotation service's OAuth
 * endpoints.
 */
class OAuthClient {
  /**
   * Create a new OAuthClient
   *
   * @param {Config} config
   */
  constructor(config) {
    this.clientId = config.clientId;
    this.tokenEndpoint = config.tokenEndpoint;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.revokeEndpoint = config.revokeEndpoint;

    // Test seam
    this.generateState = config.generateState || generateState;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   *
   * @param {string} code
   * @return {Promise<TokenInfo>}
   */
  exchangeAuthCode(code) {
    const data = {
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code,
    };
    return this._formPost(this.tokenEndpoint, data).then(response => {
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
   *
   * @param {string} token
   * @return {Promise<TokenInfo>}
   */
  exchangeGrantToken(token) {
    const data = {
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
   *
   * @param {string} refreshToken
   * @return {Promise<TokenInfo>}
   */
  refreshToken(refreshToken) {
    const data = { grant_type: 'refresh_token', refresh_token: refreshToken };
    return this._formPost(this.tokenEndpoint, data).then(response => {
      if (response.status !== 200) {
        throw new Error('Failed to refresh access token');
      }
      return tokenInfoFrom(response);
    });
  }

  /**
   * Revoke an access and refresh token pair.
   *
   * @param {string} accessToken
   * @return {Promise}
   */
  revokeToken(accessToken) {
    return this._formPost(this.revokeEndpoint, { token: accessToken });
  }

  /**
   * Prompt the user for permission to access their data.
   *
   * Returns an authorization code which can be passed to `exchangeAuthCode`.
   *
   * @param {Window} $window - Window which will receive the auth response.
   * @param {Window} authWindow - Popup window where the login prompt will be shown.
   *   This should be created using `openAuthPopupWindow`.
   * @return {Promise<string>}
   */
  authorize($window, authWindow) {
    // Random state string used to check that auth messages came from the popup
    // window that we opened.
    const state = this.generateState();

    // Promise which resolves or rejects when the user accepts or closes the
    // auth popup.
    const authResponse = new Promise((resolve, reject) => {
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
    let authUrl = this.authorizationEndpoint;
    authUrl +=
      '?' +
      queryString.stringify({
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
   *
   * @param {string} url
   * @param {Object} data - Parameter dictionary
   */
  _formPost(url, data) {
    // The `fetch` API has native support for sending form data by setting
    // the `body` option to a `FormData` instance. We are not using that here
    // because our test environment has very limited `FormData` support and it
    // is simpler just to format the data manually.
    const formData = queryString.stringify(data);
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    return fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
  }

  /**
   * Create and show a pop-up window for use with `OAuthClient#authorize`.
   *
   * This function _must_ be called in the same turn of the event loop as the
   * button or link which initiates login to avoid triggering the popup blocker
   * in certain browsers. See https://github.com/hypothesis/client/issues/534
   * and https://github.com/hypothesis/client/issues/535.
   *
   * @param {Window} $window - The parent of the created window.
   * @return {Window} The new popup window.
   */
  static openAuthPopupWindow($window) {
    // In Chrome & Firefox the sizes passed to `window.open` are used for the
    // viewport size. In Safari the size is used for the window size including
    // title bar etc. There is enough vertical space at the bottom to allow for
    // this.
    //
    // See https://bugs.webkit.org/show_bug.cgi?id=143678
    const width = 475;
    const height = 430;
    const left = $window.screen.width / 2 - width / 2;
    const top = $window.screen.height / 2 - height / 2;

    // Generate settings for `window.open` in the required comma-separated
    // key=value format.
    const authWindowSettings = queryString
      .stringify({
        left: left,
        top: top,
        width: width,
        height: height,
      })
      .replace(/&/g, ',');

    return $window.open(
      'about:blank',
      'Log in to Hypothesis',
      authWindowSettings
    );
  }
}

module.exports = OAuthClient;
