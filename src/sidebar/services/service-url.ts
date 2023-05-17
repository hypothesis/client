import type { SidebarStore } from '../store';
import type { APIRoutesService } from './api-routes';

/**
 * Service for fetching the data needed to render URLs that point to the H
 * service.
 *
 * The H API has an `/api/links` endpoint that returns a map of link name to
 * URL template for URLs that point to the H API. This service fetches that
 * data and persists it in the store.
 *
 * To use a link within a UI component, use `store.getLink(name, params)`.
 *
 * @inject
 */
export class ServiceURLService {
  private _apiRoutes: APIRoutesService;
  private _store: SidebarStore;

  constructor(apiRoutes: APIRoutesService, store: SidebarStore) {
    this._apiRoutes = apiRoutes;
    this._store = store;
  }

  /**
   * Fetch URL templates for links from the API and persist them in the store.
   */
  async init() {
    try {
      const links = await this._apiRoutes.links();
      this._store.updateLinks(links);
    } catch (error) {
      console.warn(`Failed to fetch Hypothesis links: ${error.message}`);
    }
  }
}
