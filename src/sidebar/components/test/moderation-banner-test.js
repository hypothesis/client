'use strict';

var angular = require('angular');

var util = require('../../directive/test/util');

describe('moderationBanner', function () {
  var bannerEl;
  var fakeAnnotationUI;
  var fakeFlash;
  var fakeStore;

  before(function () {
    angular.module('app', [])
      .component('moderationBanner', require('../moderation-banner'));
  });

  beforeEach(function () {
    fakeAnnotationUI = {
      flagCount: sinon.stub().returns(0),
      isHiddenByModerator: sinon.stub().returns(false),

      annotationHiddenChanged: sinon.stub(),
    };

    fakeFlash = {
      error: sinon.stub(),
    };

    fakeStore = {
      annotation: {
        hide: sinon.stub().returns(Promise.resolve()),
        unhide: sinon.stub().returns(Promise.resolve()),
      },
    };

    angular.mock.module('app', {
      annotationUI: fakeAnnotationUI,
      flash: fakeFlash,
      store: fakeStore,
    });
  });

  afterEach(function () {
    bannerEl.remove();
  });

  function createBanner(inputs) {
    inputs.isReply = inputs.isReply || false;
    var el = util.createDirective(document, 'moderationBanner', inputs);
    bannerEl = el[0];
    return bannerEl;
  }

  it('does not display if annotation is not flagged or hidden', function () {
    fakeAnnotationUI.flagCount.returns(0);
    fakeAnnotationUI.isHiddenByModerator.returns(false);
    var banner = createBanner({ annotationId: 'not-flagged-or-hidden-id' });
    assert.equal(banner.textContent.trim(), '');
  });

  it('displays the number of flags the annotation has received', function () {
    fakeAnnotationUI.flagCount.returns(10);
    var banner = createBanner({ annotationId: 'flagged-id' });
    assert.include(banner.textContent, 'Flagged for review x10');
  });

  it('displays in a more compact form if the annotation is a reply', function () {
    fakeAnnotationUI.flagCount.returns(1);
    var banner = createBanner({ annotationId: 'reply-id', isReply: true });
    assert.ok(banner.querySelector('.is-reply'));
  });

  it('reports if the annotation was hidden', function () {
    fakeAnnotationUI.isHiddenByModerator.returns(true);
    var banner = createBanner({ annotationId: 'hidden-id' });
    assert.include(banner.textContent, 'Hidden from users');
  });

  it('hides the annotation if "Hide" is clicked', function () {
    fakeAnnotationUI.flagCount.returns(10);
    var banner = createBanner({ annotationId: 'flagged-id'} );
    banner.querySelector('button').click();
    assert.calledWith(fakeStore.annotation.hide, {id: 'flagged-id'});
  });

  it('reports an error if hiding the annotation fails', function (done) {
    fakeAnnotationUI.flagCount.returns(10);
    var banner = createBanner({ annotationId: 'flagged-id'} );
    fakeStore.annotation.hide.returns(Promise.reject(new Error('Network Error')));

    banner.querySelector('button').click();

    setTimeout(function () {
      assert.calledWith(fakeFlash.error, 'Network Error');
      done();
    }, 0);
  });

  it('unhides the annotation if "Unhide" is clicked', function () {
    fakeAnnotationUI.isHiddenByModerator.returns(true);
    var banner = createBanner({ annotationId: 'hidden-id'} );

    banner.querySelector('button').click();

    assert.calledWith(fakeStore.annotation.unhide, {id: 'hidden-id'});
  });

  it('reports an error if unhiding the annotation fails', function (done) {
    fakeAnnotationUI.isHiddenByModerator.returns(true);
    var banner = createBanner({ annotationId: 'hidden-id'} );
    fakeStore.annotation.unhide.returns(Promise.reject(new Error('Network Error')));

    banner.querySelector('button').click();

    setTimeout(function () {
      assert.calledWith(fakeFlash.error, 'Network Error');
      done();
    }, 0);
  });
});
