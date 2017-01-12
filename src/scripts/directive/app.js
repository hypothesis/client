'use strict';

var AppController = require('../app-controller');

module.exports = function () {
  return {
    restrict: 'E',
    controller: AppController,
    scope: {},
    template: require('../../../templates/client/app.html'),
  };
};
