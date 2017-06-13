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
'use strict';

var events = require('./events');
var bridgeEvents = require('../shared/bridge-events');


// @ngInject
function features($log, $rootScope, bridge, session) {

  var _sendFeatureFlags = function(){
    var userFeatures = session.state.features;
    bridge.call(bridgeEvents.FEATURE_FLAGS_UPDATED, userFeatures || {});
  };

  // user changed is currently called when we initially load
  // the sidebar and when the user actually logs out/in.
  $rootScope.$on(events.USER_CHANGED, _sendFeatureFlags);

  // send on frame connected as well because the user_changed event
  // alone might run before the frames ever connected. This will
  // provide us the follow up to make sure that the frames get the flags
  $rootScope.$on(events.FRAME_CONNECTED, _sendFeatureFlags);

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

    if (!session.state.features) {
      // features data has not yet been fetched
      return false;
    }

    var features = session.state.features;
    if (!(flag in features)) {
      $log.warn('looked up unknown feature', flag);
      return false;
    }
    return features[flag];
  }

  return {
    flagEnabled: flagEnabled,
  };
}

module.exports = features;
