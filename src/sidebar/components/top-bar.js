'use strict';

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function (settings) {
    if (settings.theme && settings.theme === 'clean') {
      this.isThemeClean = true;
    } else {
      this.isThemeClean = false;
    }
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
    sortKey: '<',
    sortKeysAvailable: '<',
    onChangeSortKey: '&',
    pendingUpdateCount: '<',
    onApplyPendingUpdates: '&',
  },
  template: require('../templates/top-bar.html'),
};
