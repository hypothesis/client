import type {
  IndexResponse,
  LinksResponse,
  RouteMap,
  RouteMetadata,
} from '../../types/api';
import type { SidebarSettings } from '../../types/config';
import { fetchJSON } from '../util/fetch';
import { retryPromiseOperation } from '../util/retry';

/**
 * Fetch an API metadata file, retrying the operation if it fails.
 */
function getJSON<T>(url: string): Promise<T> {
  return retryPromiseOperation(
    () =>
      // nb. The `/api/` and `/api/links` routes are fetched without specifying
      // any additional headers/config so that we can use `<link rel="preload">` in
      // the `/app.html` response to fetch them early, while the client JS app
      // is loading.
      fetchJSON(url) as Promise<T>
  );
}

/**
 * A service which fetches and caches API route metadata.
 */
// @inject
export class APIRoutesService {
  private _apiURL: string;
  private _routeCache: Promise<RouteMap> | null;
  private _linkCache: Promise<LinksResponse> | null;

  constructor(settings: SidebarSettings) {
    this._apiURL = settings.apiUrl;
    this._routeCache = null;
    this._linkCache = null;
  }

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return Map of routes to route metadata.
   */
  routes(): Promise<RouteMap> {
    if (!this._routeCache) {
      this._routeCache = getJSON<IndexResponse>(this._apiURL).then(
        result => result.links
      );
    }
    return this._routeCache;
  }

  /**
   * Fetch and cache service page links from the API.
   */
  links(): Promise<LinksResponse> {
    if (!this._linkCache) {
      this._linkCache = this.routes().then(async routes => {
        const linksRoute = routes.links as RouteMetadata;
        return getJSON<LinksResponse>(linksRoute.url);
      });
    }
    return this._linkCache;
  }
}
