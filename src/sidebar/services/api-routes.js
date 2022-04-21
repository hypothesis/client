import { fetchJSON } from '../util/fetch';
import { retryPromiseOperation } from '../util/retry';

/**
 * Fetch an API metadata file, retrying the operation if it fails.
 *
 * @param {string} url
 */
function getJSON(url) {
  return retryPromiseOperation(() =>
    // nb. The `/api/` and `/api/links` routes are fetched without specifying
    // any additional headers/config so that we can use `<link rel="preload">` in
    // the `/app.html` response to fetch them early, while the client JS app
    // is loading.
    fetchJSON(url)
  );
}

/**
 * @typedef {import('../../types/api').IndexResponse} IndexResponse
 * @typedef {import('../../types/api').LinksResponse} LinksResponse
 * @typedef {import('../../types/api').RouteMap} RouteMap
 * @typedef {import('../../types/api').RouteMetadata} RouteMetadata
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * A service which fetches and caches API route metadata.
 */
// @inject
export class APIRoutesService {
  /**
   * @param {SidebarSettings} settings
   */
  constructor(settings) {
    this._apiURL = settings.apiUrl;

    /** @type {Promise<RouteMap>|null} */
    this._routeCache = null;

    /** @type {Promise<LinksResponse>|null} */
    this._linkCache = null;
  }

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return {Promise<RouteMap>} - Map of routes to route metadata.
   */
  routes() {
    if (!this._routeCache) {
      this._routeCache = getJSON(this._apiURL).then(result => {
        const index = /** @type {IndexResponse} */ (result);
        return index.links;
      });
    }
    return this._routeCache;
  }

  /**
   * Fetch and cache service page links from the API.
   *
   * @return {Promise<LinksResponse>}
   */
  links() {
    if (!this._linkCache) {
      this._linkCache = this.routes().then(async routes => {
        const linksRoute = /** @type {RouteMetadata} */ (routes.links);
        const links = await getJSON(linksRoute.url);
        return /** @type {LinksResponse} */ (links);
      });
    }
    return this._linkCache;
  }
}
