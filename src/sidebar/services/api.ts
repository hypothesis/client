import type {
  Annotation,
  Group,
  RouteMap,
  RouteMetadata,
  Profile,
} from '../../types/api';
import { stripInternalProperties } from '../helpers/strip-internal-properties';
import type { SidebarStore } from '../store';
import { fetchJSON } from '../util/fetch';
import { replaceURLParams } from '../util/url';
import type { APIRoutesService } from './api-routes';
import type { AuthService } from './auth';

/**
 * Types of value that can be passed as a parameter to API calls.
 */
type Param = string | number | boolean;

/**
 * Function which makes an API request.
 * @param params - A map of URL and query string parameters to include with the request.
 * @param data - The body of the request.
 */
type APICall<
  Params = Record<string, Param | Param[]>,
  Body = void,
  Result = void
> = (params: Params, data?: Body) => Promise<Result>;

/**
 * Callbacks invoked at various points during an API call to get an access token etc.
 */
type APIMethodCallbacks = {
  /** Function which acquires a valid access token for making an API request */
  getAccessToken: () => Promise<string | null>;

  /**
   * Function that returns a per-session client ID to include with the request
   * or `null`.
   */
  getClientId: () => string | null;

  /** Callback invoked when the API request starts */
  onRequestStarted: () => void;
  /** Callback invoked when the API request finishes */
  onRequestFinished: () => void;
};

function isRouteMetadata(
  link: RouteMap | RouteMetadata
): link is RouteMetadata {
  return 'url' in link;
}

/**
 * Lookup metadata for an API route in the result of an `/api/` response.
 *
 * @param route - Dot-separated path of route in `routeMap`
 */
function findRouteMetadata(
  routeMap: RouteMap,
  route: string
): RouteMetadata | null {
  let cursor = routeMap;
  const pathSegments = route.split('.');
  for (const [index, segment] of pathSegments.entries()) {
    const nextCursor = cursor[segment];
    if (!nextCursor || isRouteMetadata(nextCursor)) {
      if (nextCursor && index === pathSegments.length - 1) {
        // Found the RouteMetadata at the end of the path.
        return nextCursor;
      }
      // Didn't find the route, or found a RouteMetadata before we reached the
      // end of the path.
      break;
    }
    cursor = nextCursor;
  }
  return null;
}

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param links - API route data from API index endpoint (`/api/`)
 * @param route - The dotted path of the named API route (eg. `annotation.create`)
 * @return Function that makes an API call. The returned `APICall` has generic
 *   parameter, body and return types.
 *   This can be cast to an `APICall` with more specific types.
 */
function createAPICall(
  links: Promise<RouteMap>,
  route: string,
  {
    getAccessToken,
    getClientId,
    onRequestStarted,
    onRequestFinished,
  }: APIMethodCallbacks
): APICall<Record<string, any>, Record<string, any> | void, unknown> {
  return async (params, data) => {
    onRequestStarted();
    try {
      const [linksMap, token] = await Promise.all([links, getAccessToken()]);
      const descriptor = findRouteMetadata(linksMap, route);
      if (!descriptor) {
        throw new Error(`Missing API route: ${route}`);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Hypothesis-Client-Version': '__VERSION__',
      };

      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }

      const clientId = getClientId();
      if (clientId) {
        headers['X-Client-Id'] = clientId;
      }

      const { url, unusedParams: queryParams } = replaceURLParams(
        descriptor.url,
        params
      );

      const apiURL = new URL(url);
      for (const [key, value] of Object.entries(queryParams)) {
        const values = Array.isArray(value) ? value : [value];
        for (const item of values) {
          // eslint-disable-next-line eqeqeq
          if (item == null) {
            // Skip all parameters with nullish values.
            continue;
          }
          apiURL.searchParams.append(key, item.toString());
        }
      }

      // nb. Don't "simplify" the lines below to `return fetchJSON(...)` as this
      // would cause `onRequestFinished` to be called before the API response
      // is received.
      const result = await fetchJSON(apiURL.toString(), {
        body: data ? JSON.stringify(stripInternalProperties(data)) : null,
        headers,
        method: descriptor.method,
      });
      return result;
    } finally {
      onRequestFinished();
    }
  };
}

type AnnotationSearchResult = {
  rows: Annotation[];
  replies: Annotation[];
  total: number;
};

type IDParam = {
  id: string;
};

type ListGroupParams = {
  authority?: string;
  document_uri?: string;
  expand?: string[];
};

/**
 * API client for the Hypothesis REST API.
 *
 * Returns an object that with keys that match the routes in
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/).
 * @see APICall for the syntax of API calls. For example:
 *
 * ```
 * api.annotations.update({ id: '1234' }, annotation).then(ann => {
 *   // Do something with the updated annotation.
 * }).catch(err => {
 *   // Do something if the API call fails.
 * });
 * ```
 *
 * This service makes authenticated calls to the API, using `AuthService`
 * to get auth tokens. The URLs for API endpoints are provided by the `APIRoutesService`
 * service.
 */
// @inject
export class APIService {
  /**
   * Client session identifier included with requests. Used by the backend
   * to associate API requests with WebSocket connections from the same client.
   */
  private _clientId: string | null;

  search: APICall<Record<string, unknown>, void, AnnotationSearchResult>;
  annotation: {
    create: APICall<Record<string, unknown>, Partial<Annotation>, Annotation>;
    delete: APICall<IDParam>;
    get: APICall<IDParam, void, Annotation>;
    update: APICall<IDParam, Partial<Annotation>, Annotation>;
    flag: APICall<IDParam>;
    hide: APICall<IDParam>;
    unhide: APICall<IDParam>;
  };
  group: {
    member: {
      delete: APICall<{ pubid: string; userid: string }>;
    };
    read: APICall<{ id: string; expand: string[] }, void, Group>;
  };
  groups: {
    list: APICall<ListGroupParams, void, Group[]>;
  };
  profile: {
    groups: {
      read: APICall<{ expand: string[] }, void, Group[]>;
    };
    read: APICall<{ authority?: string }, void, Profile>;
    update: APICall<Record<string, unknown>, Partial<Profile>, Profile>;
  };

  constructor(
    apiRoutes: APIRoutesService,
    auth: AuthService,
    store: SidebarStore
  ) {
    this._clientId = null;

    const links = apiRoutes.routes();
    const getClientId = () => this._clientId;
    const apiCall = (route: string) =>
      createAPICall(links, route, {
        getAccessToken: () => auth.getAccessToken(),
        getClientId,
        onRequestStarted: store.apiRequestStarted,
        onRequestFinished: store.apiRequestFinished,
      });

    // Define available API calls.
    //
    // The type syntax is APICall<Parameters, Body, Result>, where `void` means
    // no body / empty response.

    this.search = apiCall('search') as APICall<
      Record<string, unknown>,
      void,
      AnnotationSearchResult
    >;
    this.annotation = {
      create: apiCall('annotation.create') as APICall<
        Record<string, unknown>,
        Partial<Annotation>,
        Annotation
      >,
      delete: apiCall('annotation.delete') as APICall<IDParam>,
      get: apiCall('annotation.read') as APICall<IDParam, void, Annotation>,
      update: apiCall('annotation.update') as APICall<
        IDParam,
        Partial<Annotation>,
        Annotation
      >,
      flag: apiCall('annotation.flag') as APICall<IDParam>,
      hide: apiCall('annotation.hide') as APICall<IDParam>,
      unhide: apiCall('annotation.unhide') as APICall<IDParam>,
    };
    this.group = {
      member: {
        delete: apiCall('group.member.delete') as APICall<{
          pubid: string;
          userid: string;
        }>,
      },
      read: apiCall('group.read') as APICall<
        { id: string; expand: string[] },
        void,
        Group
      >,
    };
    this.groups = {
      list: apiCall('groups.read') as APICall<ListGroupParams, void, Group[]>,
    };
    this.profile = {
      groups: {
        read: apiCall('profile.groups.read') as APICall<
          { expand: string[] },
          void,
          Group[]
        >,
      },
      read: apiCall('profile.read') as APICall<
        { authority?: string },
        void,
        Profile
      >,
      update: apiCall('profile.update') as APICall<
        Record<string, unknown>,
        Partial<Profile>,
        Profile
      >,
    };
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
