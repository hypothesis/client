import { EventEmitter } from '../../shared/event-emitter';
// Removed unused imports: SidebarSettings, serviceConfig, OAuthClient, TokenInfo,
// resolve, APIRoutesService, LocalStorageService, ToastMessengerService

// No events are emitted by this simplified service.
export type Events = Record<string, never>;

/**
 * Minimal authorization service.
 *
 * In this simplified version, OAuth logic, token management, and
 * associated dependencies are removed. The service indicates no active
 * OAuth authentication and provides no access token.
 *
 * @inject
 */
export class AuthService extends EventEmitter<Events> {
  // No constructor needed if no dependencies are injected and
  // no initialization logic is required beyond what EventEmitter provides.
  // If EventEmitter requires a super() call, a default constructor would be fine.
  // For now, assuming a default constructor works or no constructor is needed.

  constructor() {
    super();
    // No dependencies to inject or private members to initialize related to OAuth.
  }

  /**
   * Retrieve an access token. In this simplified service, this will always
   * resolve to `null` as no OAuth flow is supported.
   */
  async getAccessToken(): Promise<string | null> {
    return Promise.resolve(null);
  }

  /**
   * Placeholder for login functionality.
   * In this simplified service, this is a no-op as OAuth is not supported.
   */
  async login(): Promise<void> {
    // No OAuth client to authorize with.
    // Users would manage login state externally if needed.
    console.warn('AuthService.login() called, but OAuth is not supported.');
    return Promise.resolve();
  }

  /**
   * Placeholder for logout functionality.
   * In this simplified service, this is a no-op as OAuth is not supported.
   */
  async logout(): Promise<void> {
    // No tokens to revoke or remove.
    console.warn('AuthService.logout() called, but OAuth is not supported.');
    return Promise.resolve();
  }
}
