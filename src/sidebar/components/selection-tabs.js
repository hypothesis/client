'use strict';

var sessionUtil = require('../util/session-util');
var uiConstants = require('../ui-constants');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function ($element, annotationUI, features, session, settings) {
    this.TAB_ANNOTATIONS = uiConstants.TAB_ANNOTATIONS;
    this.TAB_NOTES = uiConstants.TAB_NOTES;
    this.TAB_ORPHANS = uiConstants.TAB_ORPHANS;

    this.isThemeClean = settings.theme === 'clean';

    this.isThemeCustom = settings.theme === 'custom';

    this.enableExperimentalNewNoteButton = settings.enableExperimentalNewNoteButton;

    this.selectTab = function (type) {
      annotationUI.clearSelectedAnnotations();
      annotationUI.selectTab(type);
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

    this.showSidebarTutorial = function () {
      return sessionUtil.shouldShowSidebarTutorial(session.state);
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
