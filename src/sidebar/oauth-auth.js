'use strict';

var queryString = require('query-string');

var resolve = require('./util/url-util').resolve;
var serviceConfig = require('./service-config');

/**
 * @typedef RefreshOptions
 * @property {boolean} persist - True if access tokens should be persisted for
 *   use in future sessions.
 */

/**
 * An object holding the details of an access token from the tokenUrl endpoint.
 * @typedef {Object} TokenInfo
 * @property {string} accessToken  - The access token itself.
 * @property {number} expiresAt    - The date when the timestamp will expire.
 * @property {string} refreshToken - The refresh token that can be used to
 *                                   get a new access token.
 */

/**
 * OAuth-based authorization service.
 *
 * A grant token embedded on the page by the publisher is exchanged for
 * an opaque access token.
 */
// @ngInject
function auth($http, $window, flash, localStorage, random, settings) {

  /**
   * Authorization code from auth popup window.
   * @type {string}
   */
  var authCode;

  /**
   * Token info retrieved via `POST /api/token` endpoint.
   *
   * Resolves to `null` if the user is not logged in.
   *
   * @type {Promise<TokenInfo|null>}
   */
  var tokenInfoPromise;

  /**
   * Absolute URL of the `/api/token` endpoint.
   */
  var tokenUrl = resolve('token', settings.apiUrl);

  /**
   * Timer ID of the current access token refresh timer.
   */
  var refreshTimer;

  /**
   * Show an error message telling the user that the access token has expired.
   */
  function showAccessTokenExpiredErrorMessage(message) {
    flash.error(
      message,
      'Hypothesis login lost',
      {
        extendedTimeOut: 0,
        tapToDismiss: false,
        timeOut: 0,
      }
    );
  }

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

  function formPost(url, data) {
    data = queryString.stringify(data);
    var requestConfig = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    };
    return $http.post(url, data, requestConfig);
  }

  function grantTokenFromHostPage() {
    var cfg = serviceConfig(settings);
    if (!cfg) {
      return null;
    }
    return cfg.grantToken;
  }

  /**
   * Return the storage key used for storing access/refresh token data for a given
   * annotation service.
   */
  function storageKey() {
    // Use a unique key per annotation service. Currently OAuth tokens are only
    // persisted for the default annotation service. If in future we support
    // logging into other services from the client, this function will need to
    // take the API URL as an argument.
    var apiDomain = new URL(settings.apiUrl).hostname;

    // Percent-encode periods to avoid conflict with section delimeters.
    apiDomain = apiDomain.replace(/\./g, '%2E');

    return `hypothesis.oauth.${apiDomain}.token`;
  }

  /**
   * Fetch the last-saved access/refresh tokens for `authority` from local
   * storage.
   */
  function loadToken() {
    var token = localStorage.getObject(storageKey());

    if (!token ||
        typeof token.accessToken !== 'string' ||
        typeof token.refreshToken !== 'string' ||
        typeof token.expiresAt !== 'number') {
      return null;
    }

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  }

  /**
   * Persist access & refresh tokens for future use.
   */
  function saveToken(token) {
    localStorage.setObject(storageKey(), token);
  }

  // Exchange the JWT grant token for an access token.
  // See https://tools.ietf.org/html/rfc7523#section-4
  function exchangeJWT(grantToken) {
    var data = {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: grantToken,
    };
    return formPost(tokenUrl, data).then(function (response) {
      if (response.status !== 200) {
        throw new Error('Failed to retrieve access token');
      }
      return tokenInfoFrom(response);
    });
  }

  /**
   * Exchange an authorization code from the `/oauth/authorize` endpoint for
   * access and refresh tokens.
   */
  function exchangeAuthCode(code) {
    var data = {
      client_id: settings.oauthClientId,
      grant_type: 'authorization_code',
      code,
    };
    return formPost(tokenUrl, data).then((response) => {
      if (response.status !== 200) {
        throw new Error('Authorization code exchange failed');
      }
      return tokenInfoFrom(response);
    });
  }

  /**
   * Exchange the refresh token for a new access token and refresh token pair.
   * See https://tools.ietf.org/html/rfc6749#section-6
   *
   * @param {string} refreshToken
   * @param {RefreshOptions} options
   * @return {Promise<TokenInfo>} Promise for the new access token
   */
  function refreshAccessToken(refreshToken, options) {
    var data = { grant_type: 'refresh_token', refresh_token: refreshToken };
    return formPost(tokenUrl, data).then((response) => {
      var tokenInfo = tokenInfoFrom(response);

      if (options.persist) {
        saveToken(tokenInfo);
      }

      return tokenInfo;
    });
  }

  /**
   * Listen for updated access & refresh tokens saved by other instances of the
   * client.
   */
  function listenForTokenStorageEvents() {
    $window.addEventListener('storage', ({ key }) => {
      if (key === storageKey()) {
        // Reset cached token information. Tokens will be reloaded from storage
        // on the next call to `tokenGetter()`.
        tokenInfoPromise = null;
      }
    });
  }

  /**
   * Retrieve an access token for the API.
   *
   * @return {Promise<string>} The API access token.
   */
  function tokenGetter() {
    if (!tokenInfoPromise) {
      var grantToken = grantTokenFromHostPage();

      if (grantToken) {
        // Exchange host-page provided grant token for a new access token.
        tokenInfoPromise = exchangeJWT(grantToken).then((tokenInfo) => {
          return tokenInfo;
        }).catch(function(err) {
          showAccessTokenExpiredErrorMessage(
            'You must reload the page to annotate.');
          throw err;
        });
      } else if (authCode) {
        // Exchange authorization code retrieved from login popup for a new
        // access token.
        tokenInfoPromise = exchangeAuthCode(authCode).then((tokenInfo) => {
          saveToken(tokenInfo);
          return tokenInfo;
        });
      } else {
        // Attempt to load the tokens from the previous session.
        tokenInfoPromise = Promise.resolve(loadToken());
      }
    }

    var origToken = tokenInfoPromise;

    return tokenInfoPromise.then(token => {
      if (!token) {
        // No token available. User will need to log in.
        return null;
      }

      if (origToken !== tokenInfoPromise) {
        // A token refresh has been initiated via a call to `refreshAccessToken`
        // below since `tokenGetter()` was called.
        return tokenGetter();
      }

      if (Date.now() > token.expiresAt) {
        // Token expired. Attempt to refresh.
        tokenInfoPromise = refreshAccessToken(token.refreshToken, {
          persist: true,
        }).catch(() => {
          // If refreshing the token fails, the user is simply logged out.
          return null;
        });

        return tokenGetter();
      } else {
        return token.accessToken;
      }
    });
  }

  /**
   * Forget any cached credentials.
   */
  function clearCache() {
    // Once cookie auth has been removed, the `clearCache` method can be removed
    // from the public API of this service in favor of `logout`.
    tokenInfoPromise = Promise.resolve(null);
    localStorage.removeItem(storageKey());
    $window.clearTimeout(refreshTimer);
  }

  /**
   * Login to the annotation service using OAuth.
   *
   * This displays a popup window which allows the user to login to the service
   * (if necessary) and then responds with an auth code which the client can
   * then exchange for access and refresh tokens.
   */
  function login() {
    // Random state string used to check that auth messages came from the popup
    // window that we opened.
    var state = random.generateHexString(16);

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
    var width  = 400;
    var height = 400;
    var left   = $window.screen.width / 2 - width / 2;
    var top    = $window.screen.height /2 - height / 2;

    var authUrl = settings.oauthAuthorizeUrl;
    authUrl += '?' + queryString.stringify({
      client_id: settings.oauthClientId,
      origin: $window.location.origin,
      response_mode: 'web_message',
      response_type: 'code',
      state: state,
    });
    var authWindowSettings = queryString.stringify({
      left: left,
      top: top,
      width: width,
      height: height,
    }).replace(/&/g, ',');
    $window.open(authUrl, 'Login to Hypothesis', authWindowSettings);

    return authResponse.then((resp) => {
      // Save the auth code. It will be exchanged for an access token when the
      // next API request is made.
      authCode = resp.code;
      tokenInfoPromise = null;
    });
  }

  /**
   * Log out of the service (in the client only).
   *
   * This revokes and then forgets any OAuth credentials that the user has.
   */
  function logout() {
    return tokenInfoPromise.then(token => {
      return formPost(settings.oauthRevokeUrl, {
        token: token.accessToken,
      });
    }).then(() => {
      clearCache();
    });
  }

  listenForTokenStorageEvents();

  return {
    clearCache,
    login,
    logout,
    tokenGetter,
  };
}

module.exports = auth;
