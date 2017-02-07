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

  // Return a new tokenInfo object from the given tokenUrl endpoint response.
  function tokenInfoFrom(response) {
    var data = response.data;
    return {
      accessToken:  data.access_token,
      expiresIn:    data.expires_in,
      refreshToken: data.refresh_token,
    };
  }

  // Post the given data to the tokenUrl endpoint as a form submission.
  // Return a Promise for the POST request.
  function postToTokenUrl(data) {
    data = queryString.stringify(data);
    var requestConfig = {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    };

    return $http.post(tokenUrl, data, requestConfig);
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
    var delay = tokenInfo.expiresIn * 1000;

    // We actually have to refresh the access token _before_ it expires.
    // If the access token expires in one hour, this should refresh it in
    // about 55 mins.
    delay = Math.floor(delay * 0.91);

    window.setTimeout(refreshAccessToken, delay, tokenInfo.refreshToken);
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

  function tokenGetter() {
    if (accessTokenPromise) {
      return accessTokenPromise;
    } else {
      var grantToken;

      if (Array.isArray(settings.services) && settings.services.length > 0) {
        grantToken = settings.services[0].grantToken;
      }

      if (!grantToken) {
        return Promise.resolve(null);
      }

      accessTokenPromise = exchangeToken(grantToken)
        .then(function (tokenInfo) {
          refreshAccessTokenBeforeItExpires(tokenInfo);
          return tokenInfo.accessToken;
        });

      return accessTokenPromise;
    }
  }

  function clearCache() {
    accessTokenPromise = null;
  }

  return {
    clearCache: clearCache,
    tokenGetter: tokenGetter,
  };
}

module.exports = auth;
