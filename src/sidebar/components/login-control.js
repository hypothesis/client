'use strict';

var persona = require('../filter/persona');
var serviceConfig = require('../service-config');

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function (serviceUrl, settings) {
    this.serviceUrl = serviceUrl;
    this.isThirdPartyUser = function() {
      return persona.isThirdPartyUser(this.auth.userid, settings.authDomain);
    };

    this.shouldShowLogOutButton = function () {
      if (this.auth.status !== 'logged-in') {
        return false;
      }
      var service = serviceConfig(settings);
      if (service && !service.onLogoutRequestProvided) {
        return false;
      }
      return true;
    };

  },
  bindings: {
    /**
     * An object representing the current authentication status.
     */
    auth: '<',
    /**
     * Called when the user clicks on the "About this version" text.
     */
    onShowHelpPanel: '&',
    /**
     * Called when the user clicks on the "Log in" text.
     */
    onLogin: '&',
    /**
     * Called when the user clicks on the "Sign Up" text.
     */
    onSignUp: '&',
    /**
     * Called when the user clicks on the "Log out" text.
     */
    onLogout: '&',
    /**
     * Whether or not to use the new design for the control.
     *
     * FIXME: should be removed when the old design is deprecated.
     */
    newStyle: '<',
  },
  template: require('../templates/login-control.html'),
};
