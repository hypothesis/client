'use strict';

const angular = require('angular');

const unroll = require('../../../shared/test/util').unroll;
const util = require('./util');

function testComponent() {
  return {
    bindToController: true,
    controllerAs: 'vm',
    controller: function() {
      this.tapCount = 0;
      this.tap = function() {
        ++this.tapCount;
      };
    },
    restrict: 'E',
    template: '<div h-on-touch="vm.tap()">Tap me</div>',
  };
}

describe('hOnTouch', function() {
  let testEl;

  before(function() {
    angular
      .module('app', [])
      .directive('hOnTouch', require('../h-on-touch'))
      .directive('test', testComponent);
  });

  beforeEach(function() {
    angular.mock.module('app');
    testEl = util.createDirective(document, 'test', {});
  });

  unroll(
    'calls the handler when activated with a "#event" event',
    function(testCase) {
      util.sendEvent(testEl[0].querySelector('div'), testCase.event);
      assert.equal(testEl.ctrl.tapCount, 1);
    },
    [
      {
        event: 'touchstart',
      },
      {
        event: 'mousedown',
      },
      {
        event: 'click',
      },
    ]
  );
});
