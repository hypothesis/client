import * as queryString from 'query-string';

/**
 * A service that manages the association between the route and route parameters
 * implied by the URL and the corresponding route state in the store.
 */
// @ngInject
export default function router($window, store) {
  /**
   * Return the name and parameters of the current route.
   */
  function currentRoute() {
    const path = $window.location.pathname;
    const pathSegments = path.slice(1).split('/');
    const params = queryString.parse($window.location.search);

    let route;
    if (pathSegments[0] === 'a') {
      route = 'annotation';
      params.id = pathSegments[1] || '';
    } else if (pathSegments[0] === 'stream') {
      route = 'stream';
    } else {
      route = 'sidebar';
    }

    return { route, params };
  }

  /**
   * Generate a URL for a given route.
   */
  function routeUrl(name, params = {}) {
    let url;
    const queryParams = { ...params };

    if (name === 'annotation') {
      const id = params.id;
      delete queryParams.id;

      url = `/a/${id}`;
    } else if (name === 'stream') {
      url = '/stream';
    } else {
      throw new Error(`Cannot generate URL for route "${name}"`);
    }

    const query = queryString.stringify(queryParams);
    if (query.length > 0) {
      url += '?' + query;
    }

    return url;
  }

  /**
   * Synchronize the route name and parameters in the store with the current
   * URL.
   */
  function sync() {
    const { route, params } = currentRoute();
    store.changeRoute(route, params);
  }

  /**
   * Navigate to a given route.
   *
   * @param {string} name
   * @param {Object} params
   */
  function navigate(name, params) {
    $window.history.pushState({}, '', routeUrl(name, params));
    sync();
  }

  // Handle back/forward navigation.
  $window.addEventListener('popstate', () => {
    // All the state we need to update the route is contained in the URL, which
    // has already been updated at this point, so just sync the store route
    // to match the URL.
    sync();
  });

  return { sync, navigate };
}
