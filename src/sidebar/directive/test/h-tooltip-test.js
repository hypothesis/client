'use strict';

const angular = require('angular');

const util = require('./util');

function testComponent() {
  return {
    controller: function() {},
    restrict: 'E',
    template: '<div aria-label="Share" h-tooltip>Label</div>',
  };
}

describe('h-tooltip', function() {
  let targetEl;
  let tooltipEl;

  before(function() {
    angular
      .module('app', [])
      .directive('hTooltip', require('../h-tooltip'))
      .directive('test', testComponent);
  });

  beforeEach(function() {
    angular.mock.module('app');
    const testEl = util.createDirective(document, 'test', {});
    targetEl = testEl[0].querySelector('div');
    tooltipEl = document.querySelector('.tooltip');
  });

  afterEach(function() {
    const testEl = document.querySelector('test');
    testEl.parentNode.removeChild(testEl);
  });

  it('appears when the target is hovered', function() {
    util.sendEvent(targetEl, 'mouseover');
    assert.equal(tooltipEl.style.visibility, '');
  });

  it('sets the label from the target\'s "aria-label" attribute', function() {
    util.sendEvent(targetEl, 'mouseover');
    assert.equal(tooltipEl.textContent, 'Share');
  });

  it('sets the direction from the target\'s "tooltip-direction" attribute', function() {
    targetEl.setAttribute('tooltip-direction', 'up');
    util.sendEvent(targetEl, 'mouseover');
    assert.deepEqual(Array.from(tooltipEl.classList), [
      'tooltip',
      'tooltip--up',
    ]);

    targetEl.setAttribute('tooltip-direction', 'down');
    util.sendEvent(targetEl, 'mouseover');
    assert.deepEqual(Array.from(tooltipEl.classList), [
      'tooltip',
      'tooltip--down',
    ]);
  });

  it('disappears when the target is unhovered', function() {
    util.sendEvent(targetEl, 'mouseout');
    assert.equal(tooltipEl.style.visibility, 'hidden');
  });

  it('disappears when the target is destroyed', function() {
    util.sendEvent(targetEl, 'mouseover');
    angular
      .element(targetEl)
      .scope()
      .$broadcast('$destroy');
    assert.equal(tooltipEl.style.visibility, 'hidden');
  });
});
