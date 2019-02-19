'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

describe('shareDialog', function() {
  let fakeAnalytics;
  let fakeStore;

  beforeEach(function() {
    fakeAnalytics = {
      track: sinon.stub(),
      events: {},
    };
    fakeStore = { frames: sinon.stub().returns([]) };

    angular
      .module('h', [])
      .component('shareDialog', require('../share-dialog'))
      .value('analytics', fakeAnalytics)
      .value('store', fakeStore)
      .value('urlEncodeFilter', function(val) {
        return val;
      });
    angular.mock.module('h');
  });

  it('generates new share link', function() {
    const element = util.createDirective(document, 'shareDialog', {});
    const uri = 'http://example.com';
    fakeStore.frames.returns([{ uri }]);
    element.scope.$digest();
    assert.equal(
      element.ctrl.sharePageLink,
      'https://hyp.is/go?url=' + encodeURIComponent(uri)
    );
  });

  it('tracks the target being shared', function() {
    const element = util.createDirective(document, 'shareDialog');
    const clickShareIcon = function(iconName) {
      element.find('.' + iconName).click();
    };

    clickShareIcon('h-icon-twitter');
    assert.equal(fakeAnalytics.track.args[0][1], 'twitter');
    clickShareIcon('h-icon-facebook');
    assert.equal(fakeAnalytics.track.args[1][1], 'facebook');
    clickShareIcon('h-icon-mail');
    assert.equal(fakeAnalytics.track.args[2][1], 'email');
  });
});
