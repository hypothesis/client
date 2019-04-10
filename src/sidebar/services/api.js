'use strict';

const get = require('lodash.get');
const queryString = require('query-string');

const { replaceURLParams } = require('../util/url-util');

/**
 * Translate the response from a failed API call into an Error-like object.
 *
 * @param {Response} response
 * @param {Object} data - The parsed JSON response
 */
function translateResponseToError(response, data) {
  let message = response.status + ' ' + response.statusText;
  if (data && data.reason) {
    message = message + ': ' + data.reason;
  }
  return new Error(message);
}

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
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
 * @prop [boolean] includeMetadata - If false (the default), the response is
 *   just the JSON response from the API. If true, the response is an `APIResponse`
 *   containing additional metadata about the request and response.
 */

/**
 * Function which makes an API request.
 *
 * @typedef {function} APICallFunction
 * @param [any] params - A map of URL and query string parameters to include with the request.
 * @param [any] data - The body of the request.
 * @param [APICallOptions] options
 * @return {Promise<any|APIResponse>}
 */

/**
 * Configuration for an API method.
 *
 * @typedef {Object} APIMethodOptions
 * @prop {() => Promise<string>} getAccessToken -
 *   Function which acquires a valid access token for making an API request.
 * @prop [() => string|null] getClientId -
 *   Function that returns a per-session client ID to include with the request
 *   or `null`.
 * @prop [() => any] onRequestStarted - Callback invoked when the API request starts.
 * @prop [() => any] onRequestFinished - Callback invoked when the API request finishes.
 */

// istanbul ignore next
const noop = () => null;

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param links - Object or promise for an object mapping named API routes to
 *                URL templates and methods
 * @param route - The dotted path of the named API route (eg. `annotation.create`)
 * @param [APIMethodOptions] - Configuration for the API method
 * @return {APICallFunction}
 */
function createAPICall(
  links,
  route,
  {
    getAccessToken = noop,
    getClientId = noop,
    onRequestStarted = noop,
    onRequestFinished = noop,
  } = {}
) {
  return function(params, data, options = {}) {
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

        const { url, params: queryParams } = replaceURLParams(
          descriptor.url,
          params
        );
        const apiUrl = new URL(url);
        apiUrl.search = queryString.stringify(queryParams);

        return fetch(apiUrl.toString(), {
          body: data ? JSON.stringify(stripInternalProperties(data)) : null,
          headers,
          method: descriptor.method,
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
 * This service handles authenticated calls to the API, using the `auth` service
 * to get auth tokens. The URLs for API endpoints are fetched from the `/api`
 * endpoint, a responsibility delegated to the `apiRoutes` service which does
 * not use authentication.
 */
// @ngInject
function api(apiRoutes, auth, store) {
  const links = apiRoutes.routes();
  let clientId = null;

  const getClientId = () => clientId;

  function apiCall(route) {
    return createAPICall(links, route, {
      getAccessToken: auth.tokenGetter,
      getClientId,
      onRequestStarted: store.apiRequestStarted,
      onRequestFinished: store.apiRequestFinished,
    });
  }

  return {
    /**
     * Set the "client ID" sent with API requests.
     *
     * This is a per-session unique ID which the client sends with REST API
     * requests and in the configuration for the real-time API to prevent the
     * client from receiving real-time notifications about its own actions.
     */
    setClientId(clientId_) {
      clientId = clientId_;
    },

    search: apiCall('search'),
    annotation: {
      create: apiCall('annotation.create'),
      delete: apiCall('annotation.delete'),
      get: apiCall('annotation.read'),
      update: apiCall('annotation.update'),
      flag: apiCall('annotation.flag'),
      hide: apiCall('annotation.hide'),
      unhide: apiCall('annotation.unhide'),
    },
    group: {
      member: {
        delete: apiCall('group.member.delete'),
      },
      read: apiCall('group.read'),
    },
    groups: {
      list: apiCall('groups.read'),
    },
    profile: {
      groups: {
        read: apiCall('profile.groups.read'),
      },
      read: apiCall('profile.read'),
      update: apiCall('profile.update'),
    },

    // The `links` endpoint is not included here. Clients should fetch these
    // from the `apiRoutes` service.
  };
}

module.exports = api;
