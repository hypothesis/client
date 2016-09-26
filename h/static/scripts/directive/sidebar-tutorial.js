'use strict';

// @ngInject
function SidebarTutorialController(session) {
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
 * @ngdoc directive
 * @name sidebarTutorial
 * @description Displays a short tutorial in the sidebar.
 */
// @ngInject
module.exports = {
  directive: function () {
    return {
      bindToController: true,
      controller: SidebarTutorialController,
      controllerAs: 'vm',
      restrict: 'E',
      scope: {},
      template: require('../../../templates/client/sidebar_tutorial.html'),
    };
  },
  Controller: SidebarTutorialController,
};
