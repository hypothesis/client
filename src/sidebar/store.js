'use strict';

var get = require('lodash.get');

var urlUtil = require('./util/url-util');

/**
 * Translate the response from a failed API call into an Error-like object.
 *
 * The details of the response are available on the `response` property of the
 * error.
 */
function translateResponseToError(response) {
  var message;
  if (response.status <= 0) {
    message = 'Service unreachable.';
  } else {
    message = response.status + ' ' + response.statusText;
    if (response.data && response.data.reason) {
      message = message + ': ' + response.data.reason;
    }
  }
  var err = new Error(message);
  err.response = response;
  return err;
}

/**
 * Return a shallow clone of `obj` with all client-only properties removed.
 * Client-only properties are marked by a '$' prefix.
 */
function stripInternalProperties(obj) {
  var result = {};

  for (var k in obj) {
    if (obj.hasOwnProperty(k) && k[0] !== '$') {
      result[k] = obj[k];
    }
  }

  return result;
}


function forEachSorted(obj, iterator, context) {
  var keys = Object.keys(obj).sort();
  for (var i = 0; i < keys.length; i++) {
    iterator.call(context, obj[keys[i]], keys[i]);
  }
  return keys;
}


function serializeValue(v) {
  if (typeof v === 'object') {
    return v instanceof Date ? v.toISOString() : JSON.stringify(v);
  }
  return v;
}


function encodeUriQuery(val) {
  return encodeURIComponent(val).replace(/%20/g, '+');
}


// Serialize an object containing parameters into a form suitable for a query
// string.
//
// This is an almost identical copy of the default Angular parameter serializer
// ($httpParamSerializer), with one important change. In Angular 1.4.x
// semicolons are not encoded in query parameter values. This is a problem for
// us as URIs around the web may well contain semicolons, which our backend will
// then proceed to parse as a delimiter in the query string. To avoid this
// problem we use a very conservative encoder, found above.
function serializeParams(params) {
  if (!params) {
    return '';
  }
  var parts = [];
  forEachSorted(params, function(value, key) {
    if (value === null || typeof value === 'undefined') {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(function(v) {
        parts.push(encodeUriQuery(key)  + '=' + encodeUriQuery(serializeValue(v)));
      });
    } else {
      parts.push(encodeUriQuery(key) + '=' + encodeUriQuery(serializeValue(value)));
    }
  });

  return parts.join('&');
}

/**
 * Creates a function that will make an API call to a named route.
 *
 * @param $http - The Angular HTTP service
 * @param $q - The Angular Promises ($q) service.
 * @param links - Object or promise for an object mapping named API routes to
 *                URL templates and methods
 * @param route - The dotted path of the named API route (eg. `annotation.create`)
 * @param {Function} tokenGetter - Function which returns a Promise for an
 *                   access token for the API.
 */
function createAPICall($http, $q, links, route, tokenGetter) {
  return function (params, data) {
    // `$q.all` is used here rather than `Promise.all` because testing code that
    // mixes native Promises with the `$q` promises returned by `$http`
    // functions gets awkward in tests.
    return $q.all([links, tokenGetter()]).then(function (linksAndToken) {
      var links = linksAndToken[0];
      var token = linksAndToken[1];

      var descriptor = typeof route === 'string' && get(links, route);
      var urlAndParams = descriptor && descriptor.url && urlUtil.replaceURLParams(descriptor.url, params)
                      || (route.url && typeof params === 'string') && { url: params, params: {} };

      var headers = {};

      if (token) {
        headers.Authorization = 'Bearer ' + token;
      }

      var req = {
        data: data ? stripInternalProperties(data) : null,
        headers: headers,
        method: descriptor && descriptor.method || 'GET',
        params: urlAndParams.params,
        paramSerializer: serializeParams,
        url: urlAndParams.url,
      };
      return $http(req);
    }).then(function (response) {
      return response.data;
    }).catch(function (response) {
      // Translate the API result into an `Error` to follow the convention that
      // Promises should be rejected with an Error or Error-like object.
      //
      // Use `$q.reject` rather than just rethrowing the Error here due to
      // mishandling of errors thrown inside `catch` handlers in Angular < 1.6
      return $q.reject(translateResponseToError(response));
    });
  };
}

/**
 * API client for the Hypothesis REST API.
 *
 * Returns an object that with keys that match the routes in
 * the Hypothesis API (see http://h.readthedocs.io/en/latest/api/).
 *
 * This service handles authenticated calls to the API, using the `auth` service
 * to get auth tokens. The URLs for API endpoints are fetched from the `/api`
 * endpoint, a responsibility delegated to the `apiRoutes` service which does
 * not use authentication.
 */
// @ngInject
function store($http, $q, apiRoutes, auth) {
  var links = apiRoutes.routes();
  function apiCall(route) {
    return createAPICall($http, $q, links, route, auth.tokenGetter);
  }

  return {
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
      read: apiCall({ url: true }),
      member: {
        delete: apiCall('group.member.delete'),
      },
    },
    profile: {
      read: apiCall('profile.read'),
      update: apiCall('profile.update'),
    },

    // The `links` endpoint is not included here. Clients should fetch these
    // from the `apiRoutes` service.
  };
}

module.exports = store;
