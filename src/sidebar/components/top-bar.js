'use strict';

const isThirdPartyService = require('../util/is-third-party-service');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function(settings) {
    if (settings.theme && settings.theme === 'clean') {
      this.isThemeClean = true;
    } else {
      this.isThemeClean = false;
    }

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
    pendingUpdateCount: '<',
    onApplyPendingUpdates: '&',
  },
  template: require('../templates/top-bar.html'),
};
