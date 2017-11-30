'use strict';

var sessionUtil = require('../util/session-util');

// @ngInject
function SidebarTutorialController(session, settings) {
  this.cleanOnboardingThemeEnabled = settings.enableCleanOnboardingTheme;

  this.showSidebarTutorial = function () {
    return sessionUtil.shouldShowSidebarTutorial(session.state);
  };

  this.dismiss = function () {
    session.dismissSidebarTutorial();
  };
}

/**
 * @name sidebarTutorial
 * @description Displays a short tutorial in the sidebar.
 */
// @ngInject
module.exports = {
  controller: SidebarTutorialController,
  controllerAs: 'vm',
  bindings: {},
  template: require('../templates/sidebar-tutorial.html'),
};
