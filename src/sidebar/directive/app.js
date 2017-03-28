'use strict';

var AppController = require('../app-controller');

module.exports = {
  controllerAs: 'vm',
  controller: AppController,
  template: require('../templates/app.html'),
};
