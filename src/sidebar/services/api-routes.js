'use strict';

const { retryPromiseOperation } = require('../util/retry');

/**
 * A service which fetches and caches API route metadata.
 */
// @ngInject
function apiRoutes(settings) {
  // Cache of route name => route metadata from API root.
  let routeCache;
  // Cache of links to pages on the service fetched from the API's "links"
  // endpoint.
  let linkCache;

  function getJSON(url) {
    const config = {
      headers: {
        'Hypothesis-Client-Version': '__VERSION__', // replaced by versionify
      },
    };
    return fetch(url, config).then(response => {
      if (response.status !== 200) {
        throw new Error(`Fetching ${url} failed`);
      }
      return response.json();
    });
  }

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return {Promise<Object>} - Map of routes to route metadata.
   */
  function routes() {
    if (!routeCache) {
      routeCache = retryPromiseOperation(() => getJSON(settings.apiUrl)).then(
        index => index.links
      );
    }
    return routeCache;
  }

  /**
   * Fetch and cache service page links from the API.
   *
   * @return {Promise<Object>} - Map of link name to URL
   */
  function links() {
    if (!linkCache) {
      linkCache = routes().then(routes => {
        return getJSON(routes.links.url);
      });
    }
    return linkCache;
  }

  return { routes, links };
}

module.exports = apiRoutes;
