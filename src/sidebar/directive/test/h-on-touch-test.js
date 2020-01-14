import angular from 'angular';

import hOnTouch from '../h-on-touch';

import * as util from './util';

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
      .directive('hOnTouch', hOnTouch)
      .directive('test', testComponent);
  });

  beforeEach(function() {
    angular.mock.module('app');
    testEl = util.createDirective(document, 'test', {});
  });

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
  ].forEach(testCase => {
    it(`calls the handler when activated with a "${testCase.event}" event`, () => {
      util.sendEvent(testEl[0].querySelector('div'), testCase.event);
      assert.equal(testEl.ctrl.tapCount, 1);
    });
  });
});
