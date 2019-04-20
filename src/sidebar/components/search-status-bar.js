'use strict';

const uiConstants = require('../ui-constants');

module.exports = {
  controllerAs: 'vm',
  controller: function() {
    this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
    this.TAB_NOTES = uiConstants.TAB_NOTES;
    this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;
  },
  bindings: {
    filterActive: '<',
    filterMatchCount: '<',
    onClearSelection: '&',
    searchQuery: '<',
    selectedTab: '<',
    // Boolean indicating all annotations are visible (none are hidden).
    areAllAnnotationsVisible: '<',
    totalAnnotations: '<',
    totalNotes: '<',
  },
  template: require('../templates/search-status-bar.html'),
};
