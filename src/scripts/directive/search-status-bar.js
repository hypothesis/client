'use strict';

var uiConstants = require('../ui-constants');

// @ngInject
module.exports = function () {
  return {
    bindToController: true,
    controllerAs: 'vm',
    controller: function () {
      this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
      this.TAB_NOTES = uiConstants.TAB_NOTES;
      this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;
    },
    restrict: 'E',
    scope: {
      filterActive: '<',
      filterMatchCount: '<',
      onClearSelection: '&',
      searchQuery: '<',
      selectedTab: '<',
      selectionCount: '<',
      totalAnnotations: '<',
      totalNotes: '<',
    },
    template: require('../../../templates/client/search_status_bar.html'),
  };
};
