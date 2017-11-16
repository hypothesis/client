'use strict';

// @ngInject
function SidebarTutorialController(session, settings) {
  this.cleanOnboardingThemeEnabled = settings.enableCleanOnboardingTheme;

  this.showSidebarTutorial = function () {
    if (session.state.preferences) {
      if (session.state.preferences.show_sidebar_tutorial) {
        return true;
      }
    }
    return false;
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
