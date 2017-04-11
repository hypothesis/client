'use strict';

module.exports = {
  controllerAs: 'vm',
  //@ngInject
  controller: function (serviceUrl) {
    this.serviceUrl = serviceUrl;
  },
  bindings: {
    /**
     * Called when the user clicks on the "Log in" text.
     */
    onLogin: '&',
  },
  template: require('../templates/loggedout-message.html'),
};
