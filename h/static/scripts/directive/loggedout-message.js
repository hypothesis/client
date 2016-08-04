'use strict';

module.exports = function () {
  return {
    bindToController: true,
    controllerAs: 'vm',
    //@ngInject
    controller: function (serviceUrl) {
      this.serviceUrl = serviceUrl;
    },
    restrict: 'E',
    scope: {
      /**
       * Called when the user clicks on the "Log in" text.
       */
      onLogin: '&',
    },
    template: require('../../../templates/client/loggedout_message.html'),
  };
};
