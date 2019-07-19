'use strict';

const uiConstants = require('../ui-constants');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function ($element, store, features, session, settings, i18nService) {
    this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
    this.TAB_NOTES = uiConstants.TAB_NOTES;
    this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;
    this.tl = i18nService.tl;

    this.isThemeClean = settings.theme === 'clean';

    this.enableExperimentalNewNoteButton =
      settings.enableExperimentalNewNoteButton;

    this.selectTab = function(type) {
      store.clearSelectedAnnotations();
      store.selectTab(type);
    };

    this.showAnnotationsUnavailableMessage = function() {
      return (
        this.selectedTab === this.TAB_ANNOTATIONS &&
        this.totalAnnotations === 0 &&
        !this.isWaitingToAnchorAnnotations
      );
    };

    this.showNotesUnavailableMessage = function() {
      return this.selectedTab === this.TAB_NOTES && this.totalNotes === 0;
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
  template: require('../templates/selection-tabs.html'),
};
