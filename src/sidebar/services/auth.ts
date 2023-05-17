import { TinyEmitter } from 'tiny-emitter';

import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import { OAuthClient } from '../util/oauth-client';
import type { TokenInfo } from '../util/oauth-client';
import { resolve } from '../util/url';
import type { APIRoutesService } from './api-routes';
import type { LocalStorageService } from './local-storage';
import type { ToastMessengerService } from './toast-messenger';

type RefreshOptions = {
  /** True if access tokens should be persisted for use in future sessions. */
  persist: boolean;
};

const isTokenInfo = (token: unknown): token is TokenInfo =>
  !!token &&
  typeof token === 'object' &&
  'accessToken' in token &&
  typeof token.accessToken === 'string' &&
  'refreshToken' in token &&
  typeof token.refreshToken === 'string' &&
  'expiresAt' in token &&
  typeof token.expiresAt === 'number';

/**
 * Authorization service.
 *
 * This service is responsible for acquiring access tokens for making API
 * requests and making them available via the `getAccessToken()` method.
 *
 * Access tokens are acquired via the OAuth authorization flow, loading valid
 * tokens from a previous session or, on some websites, by exchanging a grant
 * token provided by the host page.
 *
 * Interaction with OAuth endpoints in the annotation service is delegated to
 * the `OAuthClient` class.
 *
 * @inject
 */
export class AuthService extends TinyEmitter {
  /**
   * Authorization code from auth popup window. Set by the login method
   * and exchanged for an Access Token on the next API call.
   */
  private _authCode: string | null;

  /** Cached OAuthClient */
  private _client: OAuthClient | null;

  /**
   * Token info retrieved via `POST /api/token` endpoint.
   *
   * Resolves to `null` if the user is not logged in.
   */
  private _tokenInfoPromise: Promise<TokenInfo | null> | null;

  // Injected services
  private _apiRoutes: APIRoutesService;
  private _localStorage: LocalStorageService;
  private _settings: SidebarSettings;
  private _toastMessenger: ToastMessengerService;
  private _window: Window;

  constructor(
    $window: Window,
    apiRoutes: APIRoutesService,
    localStorage: LocalStorageService,
    settings: SidebarSettings,
    toastMessenger: ToastMessengerService
  ) {
    super();

    this._authCode = null;
    this._client = null;
    this._tokenInfoPromise = null;

    this._apiRoutes = apiRoutes;
    this._localStorage = localStorage;
    this._settings = settings;
    this._toastMessenger = toastMessenger;
    this._window = $window;

    this._listenForTokenStorageEvents();
  }

  /**
   * Listen for updated access and refresh tokens saved by other instances of
   * the client.
   */
  private _listenForTokenStorageEvents() {
    this._window.addEventListener('storage', ({ key }) => {
      if (key === this._storageKey()) {
        // Reset cached token information. Tokens will be reloaded from storage
        // on the next call to `getAccessToken()`.
        this._tokenInfoPromise = null;
        this.emit('oauthTokensChanged');
      }
    });
  }

  /**
   * Fetch the last-saved access/refresh tokens from local storage.
   */
  private _loadToken() {
    const token = this._localStorage.getObject(this._storageKey());

    if (!isTokenInfo(token)) {
      return null;
    }

    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
    };
  }

  /**
   * Return a cached OAuthClient if available, or configure one and return it.
   */
  async _oauthClient() {
    if (this._client) {
      return this._client;
    }

    const links = await this._apiRoutes.links();
    this._client = new OAuthClient({
      clientId: this._settings.oauthClientId,
      authorizationEndpoint: links['oauth.authorize'],
      revokeEndpoint: links['oauth.revoke'],
      tokenEndpoint: resolve('token', this._settings.apiUrl),
    });
    return this._client;
  }

  /**
   * Exchange the authorization code retrieved from login popup for a new
   * access token.
   */
  private async _exchangeAuthCodeForToken(code: string) {
    const client = await this._oauthClient();
    const tokenInfo = await client.exchangeAuthCode(code);
    this._saveToken(tokenInfo);
    return tokenInfo;
  }

  /**
   * Attempt to exchange a grant token for an access token.
   *
   * Publishers or other embedders can set a grant token for a user in service
   * configuration.
   */
  private async _exchangeGrantToken(grantToken: string) {
    const client = await this._oauthClient();
    try {
      return await client.exchangeGrantToken(grantToken);
    } catch (err) {
      this._toastMessenger.error(
        `Hypothesis login lost: You must reload the page to annotate.`,
        {
          autoDismiss: false,
        }
      );
      throw err;
    }
  }

  /**
   * Retrieve any grant token set by service configuration
   */
  private _getGrantToken(): string | undefined {
    return serviceConfig(this._settings)?.grantToken;
  }

  /**
   * Return the storage key used for storing access/refresh token data for a
   * given annotation service.
   */
  private _storageKey() {
    // Use a unique key per annotation service. Currently OAuth tokens are only
    // persisted for the default annotation service. If in future we support
    // logging into other services from the client, this function will need to
    // take the API URL as an argument.
    let apiDomain = new URL(this._settings.apiUrl).hostname;

    // Percent-encode periods to avoid conflict with section delimeters.
    apiDomain = apiDomain.replace(/\./g, '%2E');

    return `hypothesis.oauth.${apiDomain}.token`;
  }

  /**
   * Persist access and refresh tokens for later reuse
   */
  private _saveToken(token: TokenInfo) {
    this._localStorage.setObject(this._storageKey(), token);
  }

  /**
   * Exchange a refresh token for a new access token and refresh token pair
   */
  private async _refreshAccessToken(
    refreshToken: string,
    options: RefreshOptions
  ): Promise<TokenInfo | null> {
    const client = await this._oauthClient();

    let token;
    try {
      token = await client.refreshToken(refreshToken);

      // Sanity check that prevents an infinite loop. Mostly useful in
      // tests.
      if (Date.now() > token.expiresAt) {
        /* istanbul ignore next */
        throw new Error('Refreshed token expired in the past');
      }
    } catch {
      // If refreshing the token fails, the user is simply logged out.
      return null;
    }

    if (options.persist) {
      this._saveToken(token);
    }

    return token;
  }

  /**
   * Retrieve an access token for use with the API
   */
  async getAccessToken(): Promise<string | null> {
    if (!this._tokenInfoPromise) {
      // No access token is set: determine how to get one. This will depend on
      // which type of login is being used
      const grantToken = this._getGrantToken();
      if (grantToken !== undefined) {
        // The user is logged in through a publisher/embedder's site and
        // a grant token has been included in service configuration
        if (!grantToken) {
          // Grant token is present but empty: this user is anonymous on the
          // publisher/embedder website
          this._tokenInfoPromise = Promise.resolve(null);
        } else {
          this._tokenInfoPromise = this._exchangeGrantToken(grantToken);
        }
      } else if (this._authCode) {
        // User has authorized through pop-up window and we have an
        // authorization code we can exchange for an access token
        this._tokenInfoPromise = this._exchangeAuthCodeForToken(this._authCode);
        this._authCode = null; // Consume the single-use auth code
      } else {
        // Attempt to retrieve stored token from previous session
        this._tokenInfoPromise = Promise.resolve(this._loadToken());
      }
    }

    // Wait for the token to resolve. Ensure that it is valid and that
    // it wasn't invalidated while it was being fetched. Refresh if needed.

    const origToken = this._tokenInfoPromise;
    const token = await this._tokenInfoPromise;

    if (!token) {
      // No token available. User will need to log in.
      return null;
    }

    if (origToken !== this._tokenInfoPromise) {
      // The token source was changed while waiting for the token to be fetched.
      // This can happen for various reasons. We'll just need to try again.
      return this.getAccessToken();
    }

    if (Date.now() > token.expiresAt) {
      // Token has expired, so we need to fetch a new one.
      const grantToken = this._getGrantToken();
      this._tokenInfoPromise = this._refreshAccessToken(token.refreshToken, {
        // Only persist tokens if automatic login is not being used.
        persist: typeof grantToken === 'undefined',
      });
      return this.getAccessToken();
    }

    return token.accessToken;
  }

  /**
   * Log in to the service using OAuth.
   *
   * Authorize through OAuthClient (this shows a pop-up window to the user).
   * Store the resulting authorization code to exchange for an access token in
   * the next API call ( {@see getAccessToken} )
   */
  async login() {
    // Any async steps before the call to `client.authorize` must complete
    // in less than ~1 second, otherwise the browser's popup blocker may block
    // the popup.
    //
    // `oauthClient` is async in case it needs to fetch links from the API.
    // This should already have happened by the time this function is called
    // however, so it will just be returning a cached value.
    const client = await this._oauthClient();
    const authCode = await client.authorize(this._window);

    // Save the auth code. It will be exchanged for an access token when the
    // next API request is made.
    this._authCode = authCode;
    this._tokenInfoPromise = null;
  }

  /**
   * Log out of the service (in the client only).
   *
   * This revokes and then forgets any OAuth credentials that the user has.
   */
  async logout() {
    const [token, client] = await Promise.all([
      this._tokenInfoPromise,
      this._oauthClient(),
    ]);

    if (token) {
      await client.revokeToken(token.accessToken);
    }

    this._tokenInfoPromise = null;

    this._localStorage.removeItem(this._storageKey());
  }
}
