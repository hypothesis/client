'use strict';

var uiConstants = require('../ui-constants');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function ($element, annotationUI, features) {
    this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
    this.TAB_NOTES = uiConstants.TAB_NOTES;
    this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;

    this.selectTab = function (type) {
      annotationUI.clearSelectedAnnotations();
      annotationUI.selectTab(type);
    };

    this.orphansTabFlagEnabled = function () {
      return features.flagEnabled('orphans_tab');
    };

    this.showViewSwitcher = function() {
      var frame = annotationUI.getState().frames[0];
      if (frame && frame.isAnnotationFetchComplete) {
        return true;
      }
      return false;
    };

    this.showAnnotationsUnavailableMessage = function () {
      return this.selectedTab === this.TAB_ANNOTATIONS &&
        this.totalAnnotations === 0 &&
        !this.isWaitingToAnchorAnnotations;
    };

    this.showNotesUnavailableMessage = function () {
      return this.selectedTab === this.TAB_NOTES &&
        this.totalNotes === 0;
    };
  },
  bindings: {
    isLoading: '<',
    isWaitingToAnchorAnnotations: '<',
    selectedTab: '<',
    totalAnnotations: '<',
    totalNotes: '<',
    totalOrphans: '<',
  },
  template: require('../templates/view-switcher.html'),
};
