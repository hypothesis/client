'use strict';

var uiConstants = require('../ui-constants');

module.exports = function () {
  return {
    bindToController: true,
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
    },
    restrict: 'E',
    scope: {
      isLoading: '<',
      isWaitingToAnchorAnnotations: '<',
      selectedTab: '<',
      totalAnnotations: '<',
      totalNotes: '<',
      totalOrphans: '<',
    },
    template: require('../../../templates/client/selection_tabs.html'),
  };
};
