'use strict';

var angular = require('angular');

var scopeTimeout = require('../util/scope-timeout');

// @ngInject
function AnnotationShareDialogController($element, $scope, analytics) {
  var self = this;
  var shareLinkInput = $element.find('input')[0];

  $scope.$watch('vm.isOpen', function (isOpen) {
    if (isOpen) {
      // Focus the input and select it once the dialog has become visible
      scopeTimeout($scope, function () {
        shareLinkInput.focus();
        shareLinkInput.select();
      });
    }
  });

  this.copyToClipboard = function (event) {
    var $container = angular.element(event.currentTarget).parent();
    var shareLinkInput = $container.find('input')[0];

    try {
      shareLinkInput.select();

      // In some browsers, execCommand() returns false if it fails,
      // in others, it may throw an exception instead.
      if (!document.execCommand('copy')) {
        throw new Error('Copying link failed');
      }

      self.copyToClipboardMessage = 'Link copied to clipboard!';
    } catch (ex) {
      self.copyToClipboardMessage = 'Select and copy to share.';
    } finally {
      setTimeout(function () {
        self.copyToClipboardMessage = null;
        $scope.$digest();
      }, 1000);
    }
  };

  this.onShareClick = function(target){
    if(target){
      analytics.track(analytics.events.ANNOTATION_SHARED, target);
    }
  };
}

module.exports = {
  controller: AnnotationShareDialogController,
  controllerAs: 'vm',
  bindings: {
    group: '<',
    uri: '<',
    isPrivate: '<',
    isOpen: '<',
    onClose: '&',
  },
  template: require('../templates/annotation-share-dialog.html'),
};
