'use strict';

const events = require('../events');
const resolve = require('../util/url-util').resolve;
const serviceConfig = require('../service-config');

/**
 * @typedef RefreshOptions
 * @property {boolean} persist - True if access tokens should be persisted for
 *   use in future sessions.
 */

/**
 * Authorization service.
 *
 * This service is responsible for acquiring access tokens for making API
 * requests and making them available via the `tokenGetter()` method.
 *
 * Access tokens are acquired via the OAuth authorization flow, loading valid
 * tokens from a previous session or, on some websites, by exchanging a grant
 * token provided by the host page.
 *
 * Interaction with OAuth endpoints in the annotation service is delegated to
 * the `OAuthClient` class.
 */
// @ngInject
function auth(
  $rootScope,
  $window,
  OAuthClient,
  apiRoutes,
  flash,
  localStorage,
  settings
) {
  /**
   * Authorization code from auth popup window.
   * @type {string}
   */
  let authCode;

  /**
   * Token info retrieved via `POST /api/token` endpoint.
   *
   * Resolves to `null` if the user is not logged in.
   *
   * @type {Promise<TokenInfo|null>}
   */
  let tokenInfoPromise;

  /** @type {OAuthClient} */
  let client;

  /**
   * Absolute URL of the `/api/token` endpoint.
   */
  const tokenUrl = resolve('token', settings.apiUrl);

  /**
   * Show an error message telling the user that the access token has expired.
   */
  function showAccessTokenExpiredErrorMessage(message) {
    flash.error(message, 'Hypothesis login lost', {
      extendedTimeOut: 0,
      tapToDismiss: false,
      timeOut: 0,
    });
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
    let apiDomain = new URL(settings.apiUrl).hostname;

    // Percent-encode periods to avoid conflict with section delimeters.
    apiDomain = apiDomain.replace(/\./g, '%2E');

    return `hypothesis.oauth.${apiDomain}.token`;
  }

  /**
   * Fetch the last-saved access/refresh tokens for `authority` from local
   * storage.
   */
  function loadToken() {
    const token = localStorage.getObject(storageKey());

    if (
      !token ||
      typeof token.accessToken !== 'string' ||
      typeof token.refreshToken !== 'string' ||
      typeof token.expiresAt !== 'number'
    ) {
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

  /**
   * Exchange the refresh token for a new access token and refresh token pair.
   *
   * @param {string} refreshToken
   * @param {RefreshOptions} options
   * @return {Promise<TokenInfo>} Promise for the new access token
   */
  function refreshAccessToken(refreshToken, options) {
    return oauthClient()
      .then(client => client.refreshToken(refreshToken))
      .then(tokenInfo => {
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
        $rootScope.$broadcast(events.OAUTH_TOKENS_CHANGED);
      }
    });
  }

  function oauthClient() {
    if (client) {
      return Promise.resolve(client);
    }
    return apiRoutes.links().then(links => {
      client = new OAuthClient({
        clientId: settings.oauthClientId,
        authorizationEndpoint: links['oauth.authorize'],
        revokeEndpoint: links['oauth.revoke'],
        tokenEndpoint: tokenUrl,
      });
      return client;
    });
  }

  /**
   * Retrieve an access token for the API.
   *
   * @return {Promise<string>} The API access token.
   */
  function tokenGetter() {
    if (!tokenInfoPromise) {
      const cfg = serviceConfig(settings);

      // Check if automatic login is being used, indicated by the presence of
      // the 'grantToken' property in the service configuration.
      if (cfg && typeof cfg.grantToken !== 'undefined') {
        if (cfg.grantToken) {
          // User is logged-in on the publisher's website.
          // Exchange the grant token for a new access token.
          tokenInfoPromise = oauthClient()
            .then(client => client.exchangeGrantToken(cfg.grantToken))
            .catch(err => {
              showAccessTokenExpiredErrorMessage(
                'You must reload the page to annotate.'
              );
              throw err;
            });
        } else {
          // User is anonymous on the publisher's website.
          tokenInfoPromise = Promise.resolve(null);
        }
      } else if (authCode) {
        // Exchange authorization code retrieved from login popup for a new
        // access token.
        const code = authCode;
        authCode = null; // Auth codes can only be used once.
        tokenInfoPromise = oauthClient()
          .then(client => client.exchangeAuthCode(code))
          .then(tokenInfo => {
            saveToken(tokenInfo);
            return tokenInfo;
          });
      } else {
        // Attempt to load the tokens from the previous session.
        tokenInfoPromise = Promise.resolve(loadToken());
      }
    }

    const origToken = tokenInfoPromise;

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
        let shouldPersist = true;

        // If we are using automatic login via a grant token, do not persist the
        // initial access token or refreshed tokens.
        const cfg = serviceConfig(settings);
        if (cfg && typeof cfg.grantToken !== 'undefined') {
          shouldPersist = false;
        }

        // Token expired. Attempt to refresh.
        tokenInfoPromise = refreshAccessToken(token.refreshToken, {
          persist: shouldPersist,
        })
          .then(token => {
            // Sanity check that prevents an infinite loop. Mostly useful in
            // tests.
            if (Date.now() > token.expiresAt) {
              throw new Error('Refreshed token expired in the past');
            }
            return token;
          })
          .catch(() => {
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
   * Login to the annotation service using OAuth.
   *
   * This displays a popup window which allows the user to login to the service
   * (if necessary) and then responds with an auth code which the client can
   * then exchange for access and refresh tokens.
   */
  function login() {
    const authWindow = OAuthClient.openAuthPopupWindow($window);
    return oauthClient()
      .then(client => {
        return client.authorize($window, authWindow);
      })
      .then(code => {
        // Save the auth code. It will be exchanged for an access token when the
        // next API request is made.
        authCode = code;
        tokenInfoPromise = null;
      });
  }

  /**
   * Log out of the service (in the client only).
   *
   * This revokes and then forgets any OAuth credentials that the user has.
   */
  async function logout() {
    const [token, client] = await Promise.all([
      tokenInfoPromise,
      oauthClient(),
    ]);
    await client.revokeToken(token.accessToken);

    // eslint-disable-next-line require-atomic-updates
    tokenInfoPromise = Promise.resolve(null);

    localStorage.removeItem(storageKey());
  }

  listenForTokenStorageEvents();

  return {
    login,
    logout,
    tokenGetter,
  };
}

module.exports = auth;
