import type { APIService } from './api';

/**
 * @inject
 */
export class AnalyticsService {
  private _api: APIService;

  constructor(api: APIService) {
    this._api = api;
  }

  trackApplyPendingUpdatesEvent(): void {
    this._api.analytics.events
      .create({}, { event: 'APPLY_PENDING_UPDATES' })
      .catch(e =>
        console.error('Could not track applying pending updates.', e),
      );
  }
}
