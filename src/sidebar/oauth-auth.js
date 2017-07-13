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
   * Access token retrieved via `POST /token` endpoint.
   * @type {Promise<string>}
   */
  var accessTokenPromise;
  var tokenUrl = resolve('token', settings.apiUrl);

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
   * An object holding the details of an access token from the tokenUrl endpoint.
   * @typedef {Object} TokenInfo
   * @property {string} accessToken  - The access token itself.
   * @property {number} expiresAt    - The date when the timestamp will expire.
   * @property {string} refreshToken - The refresh token that can be used to
   *                                   get a new access token.
   */

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

      // Set the expiry date to some time before the actual expiry date so that
      // we will refresh it before it actually expires.
      expiresAt: Date.now() + (data.expires_in * 1000 * 0.91),

      refreshToken: data.refresh_token,
    };
  }

  // Post the given data to the tokenUrl endpoint as a form submission.
  // Return a Promise for the access token response.
  function postToTokenUrl(data) {
    data = queryString.stringify(data);
    var requestConfig = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    };
    return $http.post(tokenUrl, data, requestConfig);
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
  function exchangeToken(grantToken) {
    var data = {
      // FIXME: This should be set to the appropriate grant type if we are
      //        exchanging an authorization code for a grant token, which
      //        is the case for first-party accounts.
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: grantToken,
    };
    return postToTokenUrl(data).then(function (response) {
      if (response.status !== 200) {
        throw new Error('Failed to retrieve access token');
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
   * @return {Promise<string|null>} Promise for the new access token
   */
  function refreshAccessToken(refreshToken, options) {
    var data = { grant_type: 'refresh_token', refresh_token: refreshToken };
    return postToTokenUrl(data).then((response) => {
      var tokenInfo = tokenInfoFrom(response);

      if (options.persist) {
        saveToken(tokenInfo);
      }

      refreshAccessTokenBeforeItExpires(tokenInfo, {
        persist: options.persist,
      });
      accessTokenPromise = Promise.resolve(tokenInfo.accessToken);

      return tokenInfo.accessToken;
    }).catch(function() {
      showAccessTokenExpiredErrorMessage(
        'You must reload the page to continue annotating.');
      return null;
    });
  }

  /**
   * Schedule a refresh of an access token a few minutes before it expires.
   *
   * @param {TokenInfo} tokenInfo
   * @param {RefreshOptions} options
   */
  function refreshAccessTokenBeforeItExpires(tokenInfo, options) {
    // The delay, in milliseconds, before we will poll again to see if it's
    // time to refresh the access token.
    var delay = 30000;

    // If the token info's refreshAfter time will have passed before the next
    // time we poll, then refresh the token this time.
    var refreshAfter = tokenInfo.expiresAt - delay;

    function refreshAccessTokenIfNearExpiry() {
      if (Date.now() > refreshAfter) {
        refreshAccessToken(tokenInfo.refreshToken, {
          persist: options.persist,
        });
      } else {
        refreshAccessTokenBeforeItExpires(tokenInfo, options);
      }
    }

    window.setTimeout(refreshAccessTokenIfNearExpiry, delay);
  }

  /**
   * Retrieve an access token for the API.
   *
   * @return {Promise<string>} The API access token.
   */
  function tokenGetter() {
    if (!accessTokenPromise) {
      var grantToken = grantTokenFromHostPage();

      if (grantToken) {
        // Exchange host-page provided grant token for a new access token.
        accessTokenPromise = exchangeToken(grantToken).then(function (tokenInfo) {
          refreshAccessTokenBeforeItExpires(tokenInfo, { persist: false });
          return tokenInfo.accessToken;
        }).catch(function(err) {
          showAccessTokenExpiredErrorMessage(
            'You must reload the page to annotate.');
          throw err;
        });
      } else if (authCode) {
        // Exchange authorization code retrieved from login popup for a new
        // access token.
        accessTokenPromise = exchangeToken(authCode).then((tokenInfo) => {
          saveToken(tokenInfo);
          refreshAccessTokenBeforeItExpires(tokenInfo, { persist: true });
          return tokenInfo.accessToken;
        });
      } else {
        // Attempt to load the tokens from the previous session.
        var tokenInfo = loadToken();
        if (!tokenInfo) {
          // No token. The user will need to log in.
          accessTokenPromise = Promise.resolve(null);
        } else if (Date.now() > tokenInfo.expiresAt) {
          // Token has expired. Attempt to refresh it.
          accessTokenPromise = refreshAccessToken(tokenInfo.refreshToken, {
            persist: true,
          });
        } else {
          // Token still valid, but schedule a refresh.
          refreshAccessTokenBeforeItExpires(tokenInfo, { persist: true });
          accessTokenPromise = Promise.resolve(tokenInfo.accessToken);
        }
      }
    }

    return accessTokenPromise;
  }

  // clearCache() isn't implemented (or needed) yet for OAuth.
  // In the future, for example when OAuth-authenticated users can login and
  // logout of the client, this clearCache() will need to clear the access
  // token and cancel any scheduled refresh token requests.
  function clearCache() {
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
      accessTokenPromise = null;
    });
  }

  return {
    clearCache,
    login,
    tokenGetter,
  };
}

module.exports = auth;
