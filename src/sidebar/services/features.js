import { watch } from '../util/watch';

/**
 * Service that provides operations related to feature flags.
 *
 * Feature flags information is part of the user's profile and in the sidebar
 * is accessed via the store. This service synchronizes the state of feature
 * flags to the `annotator` side of the application.
 *
 * Note that the state of feature flags can change whenever the active profile
 * information changes.
 *
 * @inject
 */
export class FeaturesService {
  /**
   * @param {import('../services/frame-sync').FrameSyncService} frameSync
   * @param {import('../store').SidebarStore} store
   */
  constructor(frameSync, store) {
    this._frameSync = frameSync;
    this._store = store;
  }

  init() {
    watch(
      this._store.subscribe,
      () => this._store.profile().features,
      flags => this._frameSync.notifyHost('featureFlagsUpdated', flags || {})
    );
  }
}
