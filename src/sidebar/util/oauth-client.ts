import { generateHexString } from '../../shared/random';
import { fetchJSON } from './fetch';

/**
 * OAuth access token response.
 *
 * See https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
 */
type AccessTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

/**
 * OAuth authorization code response.
 *
 * See https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2
 */
type AuthorizationCodeResponse = {
  code: string;
  state?: string;

  /** Non-standard field to differentiate this from an unsuccessful response. */
  type: 'authorization_response';
};

/**
 * Response sent back from popup window if the user closes the popup before
 * completing authorization.
 */
type AuthorizationCanceledResponse = {
  state?: string;
  type: 'authorization_canceled';
};

/**
 * Response from the authorization popup window.
 */
type AuthorizationResponse =
  | AuthorizationCodeResponse
  | AuthorizationCanceledResponse;

/**
 * Access token and associated metadata received from the Hypothesis server.
 */
export type TokenInfo = {
  /**
   * The access token that should be passed to the API in an `Authorization: Bearer ${TOKEN}`
   * header.
   */
  accessToken: string;

  /**
   * The date when the timestamp will expire.
   *
   * This uses the same epoch and units as {@link Date.now}.
   */
  expiresAt: number;

  /** The refresh token that can be used to get a new access token. */
  refreshToken: string;
};

/**
 * Error thrown if fetching or revoking an access token fails.
 */
export class TokenError extends Error {
  /**
   * Original cause of this error.
   *
   * See also https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause.
   */
  cause: Error;

  /**
   * @param cause - The error which caused the token fetch to fail
   */
  constructor(message: string, cause: Error) {
    super(message);
    this.cause = cause;
  }
}

/**
 * OAuthClient configuration.
 */
export type Config = {
  /** OAuth client ID */
  clientId: string;

  /**
   * OAuth token exchange / refresh endpoint.
   *
   * See https://datatracker.ietf.org/doc/html/rfc6749#section-3.2.
   */
  tokenEndpoint: string;

  /**
   * OAuth authorization endpoint.
   *
   * See https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.
   */
  authorizationEndpoint: string;

  /** RFC 7009 token revocation endpoint. */
  revokeEndpoint: string;
};

/**
 * OAuthClient handles interaction with the annotation service's OAuth
 * endpoints.
 */
export class OAuthClient {
  clientId: string;
  tokenEndpoint: string;
  authorizationEndpoint: string;
  revokeEndpoint: string;

  /**
   * Create a new OAuthClient
   */
  constructor(config: Config) {
    this.clientId = config.clientId;
    this.tokenEndpoint = config.tokenEndpoint;
    this.authorizationEndpoint = config.authorizationEndpoint;
    this.revokeEndpoint = config.revokeEndpoint;
  }

  /**
   * Exchange an authorization code for access and refresh tokens.
   */
  exchangeAuthCode(code: string): Promise<TokenInfo> {
    return this._getAccessToken({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code,
    });
  }

  /**
   * Exchange a grant token for access and refresh tokens.
   *
   * See https://tools.ietf.org/html/rfc7523#section-4
   */
  exchangeGrantToken(token: string): Promise<TokenInfo> {
    return this._getAccessToken({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    });
  }

  /**
   * Refresh an access and refresh token pair.
   *
   * See https://tools.ietf.org/html/rfc6749#section-6
   */
  refreshToken(refreshToken: string): Promise<TokenInfo> {
    return this._getAccessToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  /**
   * Revoke an access and refresh token pair.
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      await this._formPost(this.revokeEndpoint, { token: accessToken });
    } catch (err) {
      throw new TokenError('Failed to revoke access token', err);
    }
  }

  /**
   * Prompt the user for permission to access their data.
   *
   * @param $window - Window which will receive the auth response.
   * @return - Authorization code which can be passed to {@link exchangeAuthCode}.
   */
  authorize($window: Window): Promise<string> {
    // Random state string used to check that auth messages came from the popup
    // window that we opened.
    //
    // See https://tools.ietf.org/html/rfc6749#section-4.1.1.
    const state = generateHexString(16);

    // Promise which resolves or rejects when the user accepts or closes the
    // auth popup.
    const authResponse = new Promise<AuthorizationCodeResponse>(
      (resolve, reject) => {
        function authRespListener(event: MessageEvent) {
          if (typeof event.data !== 'object') {
            return;
          }
          const response = event.data as AuthorizationResponse;
          if (response.state !== state) {
            // This message came from a different popup window.
            return;
          }

          if (response.type === 'authorization_response') {
            resolve(event.data);
          }
          if (response.type === 'authorization_canceled') {
            reject(new Error('Authorization window was closed'));
          }
          $window.removeEventListener('message', authRespListener);
        }
        $window.addEventListener('message', authRespListener);
      }
    );

    // Authorize user and retrieve grant token
    const authURL = new URL(this.authorizationEndpoint);
    authURL.searchParams.set('client_id', this.clientId);
    authURL.searchParams.set('origin', $window.location.origin);
    authURL.searchParams.set('response_mode', 'web_message');
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set('state', state);

    // In Chrome & Firefox the sizes passed to `window.open` are used for the
    // viewport size. In Safari the size is used for the window size including
    // title bar etc. There is enough vertical space at the bottom to allow for
    // this.
    //
    // See https://bugs.webkit.org/show_bug.cgi?id=143678
    const width = 475;
    const height = 430;
    const left = $window.screen.width / 2 - width / 2;
    const top = $window.screen.height / 2 - height / 2;

    // Generate settings for `window.open` in the required comma-separated
    // key=value format.
    const authWindowSettings = `left=${left},top=${top},width=${width},height=${height}`;
    const authWindow = $window.open(
      authURL.toString(),
      'Log in to Hypothesis',
      authWindowSettings
    );

    if (!authWindow) {
      throw new Error('Failed to open login window');
    }

    return authResponse.then(rsp => rsp.code);
  }

  /**
   * Make an `application/x-www-form-urlencoded` POST request.
   *
   * @param data - Form field name/value dictionary
   */
  private async _formPost(url: string, data: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      params.set(key, value);
    }

    // Tests currently expect sorted parameters.
    params.sort();

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    return fetchJSON(url, {
      method: 'POST',
      headers,
      body: params.toString(),
    });
  }

  /**
   * Fetch an OAuth access token.
   *
   * See https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
   *
   * @param data - Fields for form POST request
   */
  private async _getAccessToken(
    data: Record<string, string>
  ): Promise<TokenInfo> {
    let response;
    try {
      response = (await this._formPost(
        this.tokenEndpoint,
        data
      )) as AccessTokenResponse;
    } catch (err) {
      throw new TokenError('Failed to fetch access token', err);
    }

    return {
      accessToken: response.access_token,

      // Set the expiry date to some time slightly before that implied by
      // `expires_in` to account for the delay in the client receiving the
      // response.
      expiresAt: Date.now() + (response.expires_in - 10) * 1000,

      refreshToken: response.refresh_token,
    };
  }
}
