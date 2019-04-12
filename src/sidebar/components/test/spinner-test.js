'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

const module = angular.mock.module;
const inject = angular.mock.inject;

describe('spinner', function() {
  let $animate = null;
  let $element = null;
  let sandbox = null;

  before(function() {
    angular.module('h', []).component('spinner', require('../spinner'));
  });

  beforeEach(module('h'));

  beforeEach(inject(function(_$animate_) {
    sandbox = sinon.sandbox.create();

    $animate = _$animate_;
    sandbox.spy($animate, 'enabled');

    $element = util.createDirective(document, 'spinner');
  }));

  afterEach(function() {
    sandbox.restore();
  });

  it('disables ngAnimate animations for itself', function() {
    assert.calledOnce($animate.enabled);

    const [enabled, jqElement] = $animate.enabled.getCall(0).args;
    assert.equal(enabled, false);
    assert.equal(jqElement[0], $element[0]);
  });
});
