'use strict';

module.exports = {
  controllerAs: 'vm',

  //@ngInject
  controller: function() {},

  bindings: {
    /**
     * An object representing the current authentication status.
     */
    auth: '<',
    /**
     * Called when the user clicks on the "About this version" text.
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
  },
  template: require('../templates/login-control.html'),
};
