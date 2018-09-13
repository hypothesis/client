'use strict';

const angular = require('angular');

const module = angular.mock.module;
const inject = angular.mock.inject;

describe('spinner', function () {
  let $animate = null;
  let $element = null;
  let sandbox = null;

  before(function () {
    angular.module('h', []).directive('spinner', require('../spinner'));
  });

  beforeEach(module('h'));

  beforeEach(inject(function (_$animate_, $compile, $rootScope) {
    sandbox = sinon.sandbox.create();

    $animate = _$animate_;
    sandbox.spy($animate, 'enabled');

    $element = angular.element('<span class="spinner"></span>');
    $compile($element)($rootScope.$new());
  }));

  afterEach(function () {
    sandbox.restore();
  });

  it('disables ngAnimate animations for itself', function () {
    assert.calledWith($animate.enabled, false, sinon.match($element));
  });
});
