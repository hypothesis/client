'use strict';

var angular = require('angular');

var util = require('./util');

describe('shareDialog', function () {
  var fakeFrameSync;

  beforeEach(function () {
    fakeFrameSync = { frames: [] };

    angular.module('h', [])
      .directive('shareDialog', require('../share-dialog'))
      .value('frameSync', fakeFrameSync)
      .value('urlEncodeFilter', function (val) { return val; });
    angular.mock.module('h');
  });

  it('generates new via link', function () {
    var element = util.createDirective(document, 'shareDialog', {});
    fakeFrameSync.frames.push({ uri: 'http://example.com' });
    element.scope.$digest();
    assert.equal(element.ctrl.viaPageLink, 'https://via.hypothes.is/http://example.com');
  });

  it('does not generate new via link if already on via', function () {
    var element = util.createDirective(document, 'shareDialog', {});
    fakeFrameSync.frames.push({ uri: 'https://via.hypothes.is/http://example.com' });
    element.scope.$digest();
    assert.equal(element.ctrl.viaPageLink, 'https://via.hypothes.is/http://example.com');
  });
});
