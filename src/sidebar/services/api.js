import * as queryString from 'query-string';

import { replaceURLParams } from '../util/url';

/**
 * @typedef {import('../../types/api').RouteMap} RouteMap
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
 * @typedef APIResponse
 * @prop {any} data -
 *  The JSON response from the API call, unless this call returned a
 *  "204 No Content" status.
 * @prop {string|null} token - The access token that was used to make the call
 *   or `null` if unauthenticated.
 */

/**
 * Options controlling how an API call is made or processed.
 *
 * @typedef APICallOptions
 * @prop {boolean} [includeMetadata] - If false (the default), the response is
 *   just the JSON response from the API. If true, the response is an `APIResponse`
 *   containing additional metadata about the request and response.
 */

/**
 * Function which makes an API request.
 *
 * @callback APICallFunction
 * @param {Record<string, any>} params - A map of URL and query string parameters to include with the request.
 * @param {object} [data] - The body of the request.
 * @param {APICallOptions} [options]
 * @return {Promise<any|APIResponse>}
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
 * @return {APICallFunction}
 */
function createAPICall(
  links,
  route,
  { getAccessToken, getClientId, onRequestStarted, onRequestFinished }
) {
  return function (params, data, options = {}) {
    onRequestStarted();

    let accessToken;
    return Promise.all([links, getAccessToken()])
      .then(([links, token]) => {
        const descriptor = get(links, route);
        const headers = {
          'Content-Type': 'application/json',
          'Hypothesis-Client-Version': '__VERSION__', // replaced by versionify
        };

        accessToken = token;
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
        const apiUrl = new URL(url);
        apiUrl.search = queryString.stringify(queryParams);

        return fetch(apiUrl.toString(), {
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

          if (options.includeMetadata) {
            return { data, token: accessToken };
          } else {
            return data;
          }
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
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/). See
 * `APICallFunction` for the syntax of API calls. For example:
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

    this.search = apiCall('search');
    this.annotation = {
      create: apiCall('annotation.create'),
      delete: apiCall('annotation.delete'),
      get: apiCall('annotation.read'),
      update: apiCall('annotation.update'),
      flag: apiCall('annotation.flag'),
      hide: apiCall('annotation.hide'),
      unhide: apiCall('annotation.unhide'),
    };
    this.group = {
      member: {
        delete: apiCall('group.member.delete'),
      },
      read: apiCall('group.read'),
    };
    this.groups = {
      list: apiCall('groups.read'),
    };
    this.profile = {
      groups: {
        read: apiCall('profile.groups.read'),
      },
      read: apiCall('profile.read'),
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
