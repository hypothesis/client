'use strict';

var queryString = require('query-string');

var resolve = require('./util/url-util').resolve;

/**
 * OAuth-based authentication service used for publisher accounts.
 *
 * A grant token embedded on the page by the publisher is exchanged for
 * an opaque access token.
 */
// @ngInject
function auth($http, flash, settings) {

  var accessTokenPromise;
  var tokenUrl = resolve('token', settings.apiUrl);

  /**
   * An object holding the details of an access token from the tokenUrl endpoint.
   * @typedef {Object} TokenInfo
   * @property {string} accessToken  - The access token itself.
   * @property {number} expiresIn    - The lifetime of the access token,
   *                                   in seconds.
   * @property {Date} refreshAfter   - A time before the access token's expiry
   *                                   time, after which the code should
   *                                   attempt to refresh the access token.
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
      expiresIn:    data.expires_in,

      // We actually have to refresh the access token _before_ it expires.
      // If the access token expires in one hour, this should refresh it in
      // about 55 mins.
      refreshAfter: new Date(Date.now() + (data.expires_in * 1000 * 0.91)),

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

  // Exchange the JWT grant token for an access token.
  // See https://tools.ietf.org/html/rfc7523#section-4
  function exchangeToken(grantToken) {
    var data = {
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

  // Exchange the refresh token for a new access token and refresh token pair.
  // See https://tools.ietf.org/html/rfc6749#section-6
  function refreshAccessToken(refreshToken) {
    var data = {grant_type: 'refresh_token', refresh_token: refreshToken};
    postToTokenUrl(data).then(function (response) {
      var tokenInfo = tokenInfoFrom(response);
      refreshAccessTokenBeforeItExpires(tokenInfo);
      accessTokenPromise = Promise.resolve(tokenInfo.accessToken);
    });
  }

  // Set a timeout to refresh the access token a few minutes before it expires.
  function refreshAccessTokenBeforeItExpires(tokenInfo) {
    // The delay, in milliseconds, before we will poll again to see if it's
    // time to refresh the access token.
    var delay = 30000;

    // If the token info's refreshAfter time will have passed before the next
    // time we poll, then refresh the token this time.
    var refreshAfter = tokenInfo.refreshAfter.valueOf() - delay;

    function refreshAccessTokenIfNearExpiry() {
      if (Date.now() > refreshAfter) {
        refreshAccessToken(tokenInfo.refreshToken);
      } else {
        refreshAccessTokenBeforeItExpires(tokenInfo);
      }
    }

    window.setTimeout(refreshAccessTokenIfNearExpiry, delay);
  }

  function tokenGetter() {
    if (!accessTokenPromise) {
      var grantToken;

      if (Array.isArray(settings.services) && settings.services.length > 0) {
        grantToken = settings.services[0].grantToken;
      }

      if (grantToken) {
        accessTokenPromise = exchangeToken(grantToken).then(function (tokenInfo) {
          refreshAccessTokenBeforeItExpires(tokenInfo);
          return tokenInfo.accessToken;
        }).catch(function(err) {
          flash.error(
            'You must reload the page to annotate.',
            'Hypothesis login failed',
            {
              extendedTimeOut: 0,
              tapToDismiss: false,
              timeOut: 0,
            }
          );
          throw err;
        });
      } else {
        accessTokenPromise = Promise.resolve(null);
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

  return {
    clearCache: clearCache,
    tokenGetter: tokenGetter,
  };
}

module.exports = auth;
