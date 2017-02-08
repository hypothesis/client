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

  // Return a cachedToken object (of the form taken by the cachedToken variable
  // in this module) from the given tokenURL endpoint response body.
  function cachedTokenFromData(data) {
    return {
      token:        data.access_token,
      refreshToken: data.refresh_token,
      expires_in:   data.expires_in,
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
      cachedToken = cachedTokenFromData(response.data);
      refreshAccessTokenBeforeItExpires(cachedToken);
    });
  }

  // Set a timeout to refresh the access token a few minutes before it expires.
  function refreshAccessTokenBeforeItExpires(cachedToken) {
    var delay = cachedToken.expires_in * 1000;

    // We actually have to refresh the access token _before_ it expires.
    // If the access token expires in one hour, this should refresh it in
    // about 55 mins.
    delay = Math.floor(delay * 0.91);

    window.setTimeout(refreshAccessToken, delay, cachedToken.refreshToken);
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
      return response.data;
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
        cachedToken = cachedTokenFromData(tokenInfo);
        refreshAccessTokenBeforeItExpires(cachedToken);
        return cachedToken.token;
      });
    }
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
