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

  var grantToken;
  if (Array.isArray(settings.services) && settings.services.length > 0) {
    grantToken = settings.services[0].grantToken;
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
        return response.data;
      });
  }

  function tokenGetter() {
    if (cachedToken) {
      return Promise.resolve(cachedToken.token);
    } else if (grantToken) {
      return exchangeToken(grantToken).then(function (tokenInfo) {
        cachedToken = {
          token: tokenInfo.access_token,
        };
        return cachedToken.token;
      });
    } else {
      return Promise.resolve(null);
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
