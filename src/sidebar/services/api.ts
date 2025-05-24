// Unused imports removed: Annotation, Group, RouteMap, RouteMetadata, Profile, GroupMembers,
// stripInternalProperties, SidebarStore, fetchJSON, replaceURLParams, APIRoutesService, AuthService
// All types related to API calls (Param, APICall, APIMethodCallbacks, etc.) are removed as they are no longer used.
// All helper functions (isRouteMetadata, findRouteMetadata, createAPICall) are removed.
// All specific API result types (AnnotationSearchResult, IDParam, ListGroupParams, AnalyticsEventName, AnalyticsEvent) are removed.

/**
 * API client for the Hypothesis REST API.
 *
 * This service is currently a shell after removal of specific API method categories
 * (profile, groups, group, annotation, search, analytics).
 * It retains the _clientId property and setClientId method for potential use
 * by other services (e.g., StreamerService) that might rely on APIService
 * for client ID management, even if no direct API calls are made by APIService itself.
 */
// @inject
export class APIService {
  /**
   * Client session identifier included with requests. Used by the backend
   * to associate API requests with WebSocket connections from the same client.
   */
  private _clientId: string | null;

  // All specific API method categories (search, annotation, group, groups, profile, analytics)
  // have been removed.

  constructor(
    // apiRoutes: APIRoutesService, // Removed
    // auth: AuthService, // Removed
    // store: SidebarStore, // Removed
  ) {
    this._clientId = null;

    // The `links`, `getClientId`, and `apiCall` setup is removed as no API calls
    // are defined on this service anymore.
  }

  /**
   * Set the "client ID" sent with API requests.
   *
   * This is a per-session unique ID which the client sends with REST API
   * requests and in the configuration for the real-time API to prevent the
   * client from receiving real-time notifications about its own actions.
   */
  setClientId(clientId: string) {
    this._clientId = clientId;
  }
}
