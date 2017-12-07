'use strict';

// @ngInject
function CreateAccountBannerController(serviceUrl) {
  this.serviceUrl = serviceUrl;
}

module.exports = {
  controller: CreateAccountBannerController,
  controllerAs: 'vm',
  bindings: {
    onLogin: '&',
  },
  template: require('../templates/create-account-banner.html'),
};
