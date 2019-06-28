'use strict';

const isThirdPartyService = require('../util/is-third-party-service');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function(settings, store, streamer) {
    if (settings.theme && settings.theme === 'clean') {
      this.isThemeClean = true;
    } else {
      this.isThemeClean = false;
    }

    this.applyPendingUpdates = streamer.applyPendingUpdates;

    this.pendingUpdateCount = store.pendingUpdateCount;

    this.showSharePageButton = function() {
      return !isThirdPartyService(settings);
    };
  },
  bindings: {
    auth: '<',
    isSidebar: '<',
    onShowHelpPanel: '&',
    onLogin: '&',
    onLogout: '&',
    onSharePage: '&',
    onSignUp: '&',
    searchController: '<',
  },
  template: require('../templates/top-bar.html'),
};
