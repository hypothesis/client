import { replaceURLParams } from '../util/url';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/api').Group} Group
 * @typedef {import('../../types/api').RouteMap} RouteMap
 * @typedef {import('../../types/api').Profile} Profile
 */

/**
 * Translate the response from a failed API call into an Error-like object.
 *
 * @param {Response} response
 * @param {Object} data - The parsed JSON response
 */
function translateResponseToError(response, data) {
  let message = response.status + ' ' + response.statusText;
  if (data?.reason) {
    message = message + ': ' + data.reason;
  }
  return new Error(message);
}

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 *
 * @param {object} obj
 */
function stripInternalProperties(obj) {
  const result = {};

  for (const k in obj) {
    if (obj.hasOwnProperty(k) && k[0] !== '$') {
      result[k] = obj[k];
    }
  }

  return result;
}

/**
 * @template {object} Body
 * @typedef APIResponse
 * @prop {Body} data -
 *  The JSON response from the API call, unless this call returned a
 *  "204 No Content" status.
 * @prop {string|null} token - The access token that was used to make the call
 *   or `null` if unauthenticated.
 */

/**
 * Types of value that can be passed as a parameter to API calls.
 *
 * @typedef {string|number|boolean} Param
 */

/**
 * Function which makes an API request.
 *
 * @template {Record<string, Param|Param[]>} Params
 * @template {object} Body
 * @template Result
 * @callback APICall
 * @param {Params} params - A map of URL and query string parameters to include with the request.
 * @param {Body} [data] - The body of the request.
 * @return {Promise<Result>}
 */

/**
 * Callbacks invoked at various points during an API call to get an access token etc.
 *
 * @typedef APIMethodCallbacks
 * @prop {() => Promise<string|null>} getAccessToken -
 *   Function which acquires a valid access token for making an API request.
 * @prop {() => string|null} getClientId -
 *   Function that returns a per-session client ID to include with the request
 *   or `null`.
 * @prop {() => any} onRequestStarted - Callback invoked when the API request starts.
 * @prop {() => any} onRequestFinished - Callback invoked when the API request finishes.
 */

function get(object, path) {
  let cursor = object;
  path.split('.').forEach(segment => {
    cursor = cursor[segment];
  });
  return cursor;
}

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param {Promise<RouteMap>} links - API route data from API index endpoint (`/api/`)
 * @param {string} route - The dotted path of the named API route (eg. `annotation.create`)
 * @param {APIMethodCallbacks} callbacks
 * @return {APICall<Record<string, any>, object, object>} - Function that makes
 *   an API call. The returned `APICall` has generic parameter, body and return types.
 *   This can be cast to an `APICall` with more specific types.
 */
function createAPICall(
  links,
  route,
  { getAccessToken, getClientId, onRequestStarted, onRequestFinished }
) {
  return (params, data) => {
    onRequestStarted();

    return Promise.all([links, getAccessToken()])
      .then(([links, token]) => {
        const descriptor = get(links, route);
        const headers = {
          'Content-Type': 'application/json',
          'Hypothesis-Client-Version': '__VERSION__', // replaced by versionify
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
        for (let [key, value] of Object.entries(queryParams)) {
          if (!Array.isArray(value)) {
            value = [value];
          }
          for (let item of value) {
            // eslint-disable-next-line eqeqeq
            if (item == null) {
              // Skip all parameters with nullish values.
              continue;
            }
            apiURL.searchParams.append(key, item.toString());
          }
        }

        return fetch(apiURL.toString(), {
          body: data ? JSON.stringify(stripInternalProperties(data)) : null,
          headers,
          method: descriptor.method,
        }).catch(() => {
          // Re-throw Fetch errors such that they all "look the same" (different
          // browsers throw different Errors on Fetch failure). This allows
          // Fetch failures to be either handled in particular ways higher up
          // or for them to be ignored in error reporting (see `sentry` config).
          throw new Error(`Fetch operation failed for URL '${url}'`);
        });
      })
      .then(response => {
        let data;

        const status = response.status;
        if (status >= 200 && status !== 204 && status < 500) {
          data = response.json();
        } else {
          data = response.text();
        }
        return Promise.all([response, data]);
      })
      .then(
        ([response, data]) => {
          // `fetch` executed the request and the response was successfully parsed.
          onRequestFinished();

          if (response.status >= 400) {
            // Translate the API result into an `Error` to follow the convention that
            // Promises should be rejected with an Error or Error-like object.
            throw translateResponseToError(response, data);
          }

          return data;
        },
        err => {
          // `fetch` failed to execute the request, or parsing the response failed.
          onRequestFinished();
          throw err;
        }
      );
  };
}

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
   * @param {import('./api-routes').APIRoutesService} apiRoutes
   * @param {import('./auth').AuthService} auth
   * @param {import('../store').SidebarStore} store
   */
  constructor(apiRoutes, auth, store) {
    const links = apiRoutes.routes();

    /**
     * Client session identifier included with requests. Used by the backend
     * to associate API requests with WebSocket connections from the same client.
     *
     * @type {string|null}
     */
    this._clientId = null;

    const getClientId = () => this._clientId;

    /** @param {string} route */
    const apiCall = route =>
      createAPICall(links, route, {
        getAccessToken: auth.getAccessToken,
        getClientId,
        onRequestStarted: store.apiRequestStarted,
        onRequestFinished: store.apiRequestFinished,
      });

    // Define available API calls.
    //
    // The type syntax is APICall<Parameters, Body, Result>, where `void` means
    // no body / empty response.

    /**
     * @typedef AnnotationSearchResult
     * @prop {Annotation[]} rows
     * @prop {Annotation[]} replies
     * @prop {number} total
     */

    /** @type {APICall<object, void, AnnotationSearchResult>} */
    this.search = apiCall('search');
    this.annotation = {
      /** @type {APICall<{}, Partial<Annotation>, Annotation>} */
      create: apiCall('annotation.create'),

      /** @type {APICall<{ id: string }, void, void>} */
      delete: apiCall('annotation.delete'),

      /** @type {APICall<{ id: string }, void, Annotation>} */
      get: apiCall('annotation.read'),

      /** @type {APICall<{ id: string }, Partial<Annotation>, Annotation>} */
      update: apiCall('annotation.update'),

      /** @type {APICall<{ id: string }, void, void>} */
      flag: apiCall('annotation.flag'),

      /** @type {APICall<{ id: string }, void, void>} */
      hide: apiCall('annotation.hide'),

      /** @type {APICall<{ id: string }, void, void>} */
      unhide: apiCall('annotation.unhide'),
    };
    this.group = {
      member: {
        /** @type {APICall<{ pubid: string, userid: string }, void, void>} */
        delete: apiCall('group.member.delete'),
      },
      /** @type {APICall<{ id: string, expand: string[] }, void, Group>} */
      read: apiCall('group.read'),
    };

    /**
     * @typedef ListGroupParams
     * @prop {string} [authority]
     * @prop {string} [document_uri]
     * @prop {string[]} [expand]
     */

    this.groups = {
      /** @type {APICall<ListGroupParams, void, Group[]>} */
      list: apiCall('groups.read'),
    };
    this.profile = {
      groups: {
        /** @type {APICall<{ expand: string[] }, void, Group[]>} */
        read: apiCall('profile.groups.read'),
      },
      /** @type {APICall<{ authority?: string }, void, Profile>} */
      read: apiCall('profile.read'),
      /** @type {APICall<{}, Partial<Profile>, Profile>} */
      update: apiCall('profile.update'),
    };
  }

  /**
   * Set the "client ID" sent with API requests.
   *
   * This is a per-session unique ID which the client sends with REST API
   * requests and in the configuration for the real-time API to prevent the
   * client from receiving real-time notifications about its own actions.
   *
   * @param {string} clientId
   */
  setClientId(clientId) {
    this._clientId = clientId;
  }
}
