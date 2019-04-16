'use strict';

const sessionUtil = require('../util/session-util');
const isThirdPartyService = require('../util/is-third-party-service');

// @ngInject
function SidebarTutorialController(session, settings) {
  // Compute once since this doesn't change after the app starts.
  const isThirdPartyService_ = isThirdPartyService(settings);

  this.isThemeClean = settings.theme === 'clean';

  this.showSidebarTutorial = function() {
    return sessionUtil.shouldShowSidebarTutorial(session.state);
  };

  this.dismiss = function() {
    session.dismissSidebarTutorial();
  };

  this.canCreatePrivateGroup = () => {
    // Private group creation in the client is limited to first party users.
    // In future we may extend this to third party users, but still disable
    // private group creation in certain contexts (eg. the LMS app).
    return !isThirdPartyService_;
  };

  this.canSharePage = () => {
    // The "Share document" icon in the toolbar is limited to first party users.
    // In future we may extend this to third party users, but still disable it
    // in certain contexts (eg. the LMS app).
    return !isThirdPartyService_;
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
