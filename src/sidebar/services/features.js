/**
 * Provides access to feature flag states for the current
 * Hypothesis user.
 *
 * This service is a thin wrapper around the feature flag data in
 * the session state.
 *
 * Users of this service should assume that the value of any given flag can
 * change at any time and should write code accordingly. Feature flags should
 * not be cached, and should not be interrogated only at setup time.
 */

import bridgeEvents from '../../shared/bridge-events';
import warnOnce from '../../shared/warn-once';
import { watch } from '../util/watch';

// @inject
export default function features(bridge, session, store) {
  const currentFlags = () => store.profile().features;
  const sendFeatureFlags = () => {
    bridge.call(bridgeEvents.FEATURE_FLAGS_UPDATED, currentFlags() || {});
  };

  // Re-send feature flags to connected frames when flags change or a new
  // frame connects.
  watch(store.subscribe, [currentFlags, () => store.frames()], () =>
    sendFeatureFlags()
  );

  /**
   * Returns true if the flag with the given name is enabled for the current
   * user.
   *
   * Returns false if session data has not been fetched for the current
   * user yet or if the feature flag name is unknown.
   */
  function flagEnabled(flag) {
    // trigger a refresh of session data, if it has not been
    // refetched within a cache timeout managed by the session service
    // (see CACHE_TTL in session.js)
    session.load();

    const flags = currentFlags();

    if (!flags) {
      // features data has not yet been fetched
      return false;
    }

    if (!(flag in flags)) {
      warnOnce('looked up unknown feature', flag);
      return false;
    }
    return flags[flag];
  }

  return {
    flagEnabled: flagEnabled,
  };
}
