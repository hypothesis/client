'use strict';

/**
 * Uses a channel between the sidebar and the attached frames to ensure
 * the interface remains in sync.
 *
 * @name AnnotationUISync
 * @param {$window} $window An Angular window service.
 * @param {Bridge} bridge
 * @param {AnnotationUI} annotationUI An instance of the AnnotatonUI service
 * @description
 * Listens for incoming events over the bridge concerning the annotation
 * interface and updates the applications internal state. It also ensures
 * that the messages are broadcast out to other frames.
 */
// @ngInject
function AnnotationUISync($rootScope, $window, annotationUI, bridge) {

  var channelListeners = {
    setVisibleHighlights: function (state) {
      if (typeof state !== 'boolean') {
        state = true;
      }
      if (annotationUI.getState().visibleHighlights !== state) {
        annotationUI.setShowHighlights(state);
        bridge.call('setVisibleHighlights', state);
      }
    },
    sidebarOpened: function () {
      $rootScope.$broadcast('sidebarOpened');
    },
  };

  for (var channel in channelListeners) {
    if (Object.prototype.hasOwnProperty.call(channelListeners, channel)) {
      var listener = channelListeners[channel];
      bridge.on(channel, listener);
    }
  }

  var onConnect = function (channel, source) {
    if (source === $window.parent) {
      // The host initializes its own state
      return;
    } else {
      // Synchronize the state of guests
      channel.call('setVisibleHighlights', annotationUI.getState().visibleHighlights);
    }
  };

  bridge.onConnect(onConnect);
}

module.exports = AnnotationUISync;
