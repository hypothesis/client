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
function auth($http, settings) {

  var accessTokenPromise;
  var tokenUrl = resolve('token', settings.apiUrl);

  /**
   * An object holding the details of an access token from the tokenUrl endpoint.
   * @typedef {Object} TokenInfo
   * @property {string} accessToken  - The access token itself.
   * @property {number} expiresIn    - The lifetime of the access token,
   *                                   in seconds.
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
    };
  }

  // Exchange the JWT grant token for an access token.
  // See https://tools.ietf.org/html/rfc7523#section-4
  function exchangeToken(grantToken) {
    var data = queryString.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: grantToken,
    });
    var requestConfig = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    };
    return $http.post(tokenUrl, data, requestConfig)
      .then(function (response) {
        if (response.status !== 200) {
          throw new Error('Failed to retrieve access token');
        }
        return tokenInfoFrom(response);
      });
  }

  function tokenGetter() {
    if (!accessTokenPromise) {
      var grantToken;

      if (Array.isArray(settings.services) && settings.services.length > 0) {
        grantToken = settings.services[0].grantToken;
      }

      if (grantToken) {
        accessTokenPromise = exchangeToken(grantToken).then(function (tokenInfo) {
          return tokenInfo.accessToken;
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
