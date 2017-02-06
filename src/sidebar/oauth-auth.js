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

  var cachedToken;
  var tokenUrl = resolve('token', settings.apiUrl);

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
        return response.data;
      });
  }

  // Exchange the refresh token for a new access token and refresh token pair.
  // See https://tools.ietf.org/html/rfc6749#section-6
  function refreshAccessToken(refreshToken) {
    var data = queryString.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    var requestConfig = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    };

    $http.post(tokenUrl, data, requestConfig).then(function (response) {
      cachedToken.token = response.data.access_token;
      cachedToken.refreshToken = response.data.refresh_token;

      var delay = response.expires_in * 1000;
      // We actually have to refresh the access token _before_ it expires.
      // If the access token expires in one hour, this should refresh it in
      // about 55 mins.
      delay = Math.floor(delay * 0.91);

      window.setTimeout(refreshAccessToken, delay, cachedToken.refreshToken);
    });

  }

  function tokenGetter() {
    if (cachedToken) {
      return Promise.resolve(cachedToken.token);
    } else {
      var grantToken;

      if (Array.isArray(settings.services) && settings.services.length > 0) {
        grantToken = settings.services[0].grantToken;
      }

      if (!grantToken) {
        return Promise.resolve(null);
      }

      return exchangeToken(grantToken).then(function (tokenInfo) {
        cachedToken = {
          token: tokenInfo.access_token,
          refreshToken: tokenInfo.refresh_token,
        };

        var delay = tokenInfo.expires_in;
        // We actually have to refresh the access token _before_ it expires.
        // If the access token expires in one hour, this should refresh it in
        // about 55 mins.
        delay = Math.floor(delay * 0.91);

        window.setTimeout(refreshAccessToken, delay, cachedToken.refreshToken);

        return cachedToken.token;
      });
    }
  }

  function clearCache() {
    cachedToken = null;
  }

  return {
    clearCache: clearCache,
    tokenGetter: tokenGetter,
  };
}

module.exports = auth;
