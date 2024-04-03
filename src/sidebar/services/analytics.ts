import type { AnalyticsEventName, APIService } from './api';

/**
 * @inject
 */
export class AnalyticsService {
  private _api: APIService;

  constructor(api: APIService) {
    this._api = api;
  }

  trackEvent(name: AnalyticsEventName): void {
    this._api.analytics.events
      .create({}, { event: name })
      .catch(e => console.warn(`Could not track event "${name}"`, e));
  }
}
