'use strict';

module.exports = function () {
  return {
    restrict: 'E',
    scope: {
      auth: '<',
      isSidebar: '<',
      onShowHelpPanel: '&',
      onLogin: '&',
      onLogout: '&',
      onSharePage: '&',
      searchController: '<',
      accountDialog: '<',
      shareDialog: '<',
      sortKey: '<',
      sortKeysAvailable: '<',
      onChangeSortKey: '&',
      pendingUpdateCount: '<',
      onApplyPendingUpdates: '&',
    },
    template: require('../../../templates/client/top_bar.html'),
  };
};
