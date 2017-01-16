'use strict';

var INITIAL_TOKEN = {
  // The user ID which the current cached token is valid for
  userid: undefined,
  // Promise for the API token for 'userid'.
  // This is initialized when fetchOrReuseToken() is called and
  // reset when logging out via logout()
  token: undefined,
};

/**
 * Fetches a new API token for the current logged-in user.
 *
 * @return {Promise} - A promise for a new JWT token.
 */
function fetchToken($http, session, settings) {
  var tokenUrl = new URL('token', settings.apiUrl).href;

  // Explicitly include the CSRF token in the headers. This won't be done
  // automatically in the extension as this will be a cross-domain request, and
  // Angular's CSRF support doesn't operate automatically cross-domain.
  var headers = {};
  headers[$http.defaults.xsrfHeaderName] = session.state.csrf;

  var config = {
    headers: headers,
    // Skip JWT authorization for the token request itself.
    skipAuthorization: true,
  };

  return $http.get(tokenUrl, config).then(function (response) {
    return response.data;
  });
}

/**
 * Service for fetching and caching access tokens for the Hypothesis API.
 */
// @ngInject
function auth($http, flash, jwtHelper, session, settings) {

  var cachedToken = INITIAL_TOKEN;

  /**
   * Fetches or returns a cached JWT API token for the current user.
   *
   * @return {Promise} - A promise for a JWT API token for the current
   *                     user.
   */
  // @ngInject
  function fetchOrReuseToken($http, jwtHelper, session, settings) {
    function refreshToken() {
      return fetchToken($http, session, settings).then(function (token) {
        return token;
      });
    }

    var userid;

    return session.load()
      .then(function (data) {
        userid = data.userid;
        if (userid === cachedToken.userid && cachedToken.token) {
          return cachedToken.token;
        } else {
          cachedToken = {
            userid: userid,
            token: refreshToken(),
          };
          return cachedToken.token;
        }
      })
      .then(function (token) {
        if (jwtHelper.isTokenExpired(token)) {
          cachedToken = {
            userid: userid,
            token: refreshToken(),
          };
          return cachedToken.token;
        } else {
          return token;
        }
      });
  }

  function clearCache() {
    cachedToken = INITIAL_TOKEN;
  }

  /**
   * Log out from the API and clear any cached tokens.
   *
   * @return {Promise<void>} - A promise for when logout has completed.
   */
  function logout() {
    return session.logout({}).$promise
      .then(function() {
        clearCache();
      })
      .catch(function(err) {
        flash.error('Log out failed!');
        throw err;
      });
  }

  /**
   * Return an access token for authenticating API requests.
   *
   * @return {Promise<string>}
   */
  function tokenGetter() {
    return fetchOrReuseToken($http, jwtHelper, session, settings);
  }

  return {
    clearCache: clearCache,
    tokenGetter: tokenGetter,
    logout: logout,
  };
}

module.exports = auth;
