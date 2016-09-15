'use strict';

var angular = require('angular');

var util = require('./util');

describe('svgIcon', function () {
  before(function () {
    angular.module('app', [])
      .directive('svgIcon', require('../svg-icon'));
  });

  beforeEach(function () {
    angular.mock.module('app');
  });

  it("sets the element's content to the content of the SVG", function () {
    var el = util.createDirective(document, 'svgIcon', {name: 'refresh'});
    assert.ok(el[0].querySelector('svg'));
  });

  it('throws an error if the icon is unknown', function () {
    assert.throws(function () {
      util.createDirective(document, 'svgIcon', {name: 'unknown'});
    });
  });
});
