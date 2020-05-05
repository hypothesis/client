/**
 * This module defines the set of global events that are dispatched
 * on $rootScope
 */
export default {
  // Session state changes

  /**
   * API tokens were fetched and saved to local storage by another client
   * instance.
   */
  OAUTH_TOKENS_CHANGED: 'oauthTokensChanged',
};
