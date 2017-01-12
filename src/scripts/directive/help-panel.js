'use strict';

/**
 * @ngdoc directive
 * @name helpPanel
 * @description Displays product version and environment info
 */
// @ngInject
module.exports = function () {
  return {
    bindToController: true,
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
          this.documentFingerprint = frames[0].documentFingerprint;
        }.bind(this)
      );
    },
    restrict: 'E',
    template: require('../../../templates/client/help_panel.html'),
    scope: {
      auth: '<',
      onClose: '&',
    },
  };
};
