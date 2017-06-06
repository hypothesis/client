'use strict';

/**
 * @ngdoc directive
 * @name helpPanel
 * @description Displays product version and environment info
 */
// @ngInject
module.exports = {
  controllerAs: 'vm',
  // @ngInject
  controller: function ($scope, $window, annotationUI, serviceUrl) {
    this.userAgent = $window.navigator.userAgent;
    this.version = '__VERSION__';  // replaced by versionify
    this.dateTime = new Date();
    this.serviceUrl = serviceUrl;

    $scope.$watch(
      function () {
        return annotationUI.frames();
      },
      function (frames) {
        if (frames.length === 0) {
          return;
        }
        this.url = frames[0].uri;
        this.documentFingerprint = frames[0].metadata.documentFingerprint;
      }.bind(this)
    );
  },
  template: require('../templates/help-panel.html'),
  bindings: {
    auth: '<',
    onClose: '&',
  },
};
