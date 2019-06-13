'use strict';

const memoize = require('../util/memoize');

const uiConstants = require('../ui-constants');

// @ngInject
function SearchStatusBarController(store, rootThread) {
  this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
  this.TAB_NOTES = uiConstants.TAB_NOTES;
  this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;

  const thread = () => {
    return rootThread.thread(store.getState());
  };

  const visibleCount = memoize(thread => {
    return thread.children.reduce(
      function(count, child) {
        return count + visibleCount(child);
      },
      thread.visible ? 1 : 0
    );
  });

  this.filterMatchCount = function() {
    return visibleCount(thread());
  };

  this.areAllAnnotationsVisible = function() {
    if (store.getState().directLinkedGroupFetchFailed) {
      return true;
    }
    const selection = store.getState().selectedAnnotationMap;
    if (!selection) {
      return false;
    }
    return Object.keys(selection).length > 0;
  };
}

module.exports = {
  controller: SearchStatusBarController,
  controllerAs: 'vm',
  bindings: {
    filterActive: '<',
    onClearSelection: '&',
    searchQuery: '<',
    selectedTab: '<',
    totalAnnotations: '<',
    totalNotes: '<',
  },
  template: require('../templates/search-status-bar.html'),
};
