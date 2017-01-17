'use strict';

var dateUtil = require('../date-util');

// @ngInject
function TimestampController($scope, time) {

  // A fuzzy, relative (eg. '6 days ago') format of the timestamp.
  this.relativeTimestamp = null;

  // A formatted version of the timestamp (eg. 'Tue 22nd Dec 2015, 16:00')
  this.absoluteTimestamp = '';

  var cancelTimestampRefresh;
  var self = this;

  function updateTimestamp() {
    self.relativeTimestamp = time.toFuzzyString(self.timestamp);
    self.absoluteTimestamp = dateUtil.format(new Date(self.timestamp));

    if (self.timestamp) {
      if (cancelTimestampRefresh) {
        cancelTimestampRefresh();
      }
      cancelTimestampRefresh = time.decayingInterval(self.timestamp, function () {
        updateTimestamp();
        $scope.$digest();
      });
    }
  }

  this.$onChanges = function (changes) {
    if (changes.timestamp) {
      updateTimestamp();
    }
  };

  this.$onDestroy = function () {
    if (cancelTimestampRefresh) {
      cancelTimestampRefresh();
    }
  };
}

module.exports = function () {
  return {
    bindToController: true,
    controller: TimestampController,
    controllerAs: 'vm',
    restrict: 'E',
    scope: {
      className: '<',
      href: '<',
      timestamp: '<',
    },
    template: ['<a class="{{vm.className}}" target="_blank" ng-title="vm.absoluteTimestamp"',
               ' href="{{vm.href}}"',
               '>{{vm.relativeTimestamp}}</a>'].join(''),
  };
};
