'use strict';

var NULL_TOKEN = Promise.resolve(null);

/**
 * Service for fetching and caching access tokens for the Hypothesis API.
 */
// @ngInject
function auth($http, jwtHelper, settings) {

  var cachedToken = NULL_TOKEN;

  /**
   * Fetch a new API token for the current logged-in user.
   *
   * The user is authenticated using their session cookie.
   *
   * @return {Promise<string>} - A promise for a new JWT token.
   */
  function fetchToken() {
    var tokenUrl = new URL('token', settings.apiUrl).href;
    return $http.get(tokenUrl, {}).then(function (response) {
      return response.data;
    });
  }

  /**
   * Fetch or return a cached JWT API token for the current user.
   *
   * @return {Promise<string>} - A promise for a JWT API token for the current
   *                             user.
   */
  function tokenGetter() {
    return cachedToken.then(function (token) {
      if (!token || jwtHelper.isTokenExpired(token)) {
        cachedToken = fetchToken();
        return cachedToken;
      } else {
        return token;
      }
    });
  }

  function clearCache() {
    cachedToken = NULL_TOKEN;
  }

  return {
    clearCache: clearCache,
    tokenGetter: tokenGetter,
  };
}

module.exports = auth;
