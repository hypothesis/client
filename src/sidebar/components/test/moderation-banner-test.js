'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');
const fixtures = require('../../test/annotation-fixtures');
const unroll = require('../../../shared/test/util').unroll;

const moderatedAnnotation = fixtures.moderatedAnnotation;

describe('moderationBanner', function() {
  let bannerEl;
  let fakeStore;
  let fakeFlash;
  let fakeApi;

  before(function() {
    angular
      .module('app', [])
      .component('moderationBanner', require('../moderation-banner'));
  });

  beforeEach(function() {
    fakeStore = {
      hideAnnotation: sinon.stub(),
      unhideAnnotation: sinon.stub(),
    };

    fakeFlash = {
      error: sinon.stub(),
    };

    fakeApi = {
      annotation: {
        hide: sinon.stub().returns(Promise.resolve()),
        unhide: sinon.stub().returns(Promise.resolve()),
      },
    };

    angular.mock.module('app', {
      store: fakeStore,
      api: fakeApi,
      flash: fakeFlash,
    });
  });

  afterEach(function() {
    bannerEl.remove();
  });

  function createBanner(inputs) {
    const el = util.createDirective(document, 'moderationBanner', inputs);
    bannerEl = el[0];
    return bannerEl;
  }

  unroll(
    'displays if user is a moderator and annotation is hidden or flagged',
    function(testCase) {
      const banner = createBanner({ annotation: testCase.ann });
      if (testCase.expectVisible) {
        assert.notEqual(banner.textContent.trim(), '');
      } else {
        assert.equal(banner.textContent.trim(), '');
      }
    },
    [
      {
        // Not hidden or flagged and user is not a moderator
        ann: fixtures.defaultAnnotation(),
        expectVisible: false,
      },
      {
        // Hidden, but user is not a moderator
        ann: Object.assign(fixtures.defaultAnnotation(), {
          hidden: true,
        }),
        expectVisible: false,
      },
      {
        // Not hidden or flagged and user is a moderator
        ann: fixtures.moderatedAnnotation({ flagCount: 0, hidden: false }),
        expectVisible: false,
      },
      {
        // Flagged but not hidden
        ann: fixtures.moderatedAnnotation({ flagCount: 1, hidden: false }),
        expectVisible: true,
      },
      {
        // Hidden but not flagged. The client only allows moderators to hide flagged
        // annotations but an unflagged annotation can still be hidden via the API.
        ann: fixtures.moderatedAnnotation({ flagCount: 0, hidden: true }),
        expectVisible: true,
      },
    ]
  );

  it('displays the number of flags the annotation has received', function() {
    const ann = fixtures.moderatedAnnotation({ flagCount: 10 });
    const banner = createBanner({ annotation: ann });
    assert.include(banner.textContent, 'Flagged for review x10');
  });

  it('displays in a more compact form if the annotation is a reply', function() {
    const ann = Object.assign(fixtures.oldReply(), {
      moderation: {
        flagCount: 10,
      },
    });
    const banner = createBanner({ annotation: ann });
    assert.ok(banner.querySelector('.is-reply'));
  });

  it('reports if the annotation was hidden', function() {
    const ann = moderatedAnnotation({
      flagCount: 1,
      hidden: true,
    });
    const banner = createBanner({ annotation: ann });
    assert.include(banner.textContent, 'Hidden from users');
  });

  it('hides the annotation if "Hide" is clicked', function() {
    const ann = moderatedAnnotation({ flagCount: 10 });
    const banner = createBanner({ annotation: ann });
    banner.querySelector('button').click();
    assert.calledWith(fakeApi.annotation.hide, { id: 'ann-id' });
  });

  it('reports an error if hiding the annotation fails', function(done) {
    const ann = moderatedAnnotation({ flagCount: 10 });
    const banner = createBanner({ annotation: ann });
    fakeApi.annotation.hide.returns(Promise.reject(new Error('Network Error')));

    banner.querySelector('button').click();

    setTimeout(function() {
      assert.calledWith(fakeFlash.error, 'Failed to hide annotation');
      done();
    }, 0);
  });

  it('unhides the annotation if "Unhide" is clicked', function() {
    const ann = moderatedAnnotation({
      flagCount: 1,
      hidden: true,
    });
    const banner = createBanner({ annotation: ann });

    banner.querySelector('button').click();

    assert.calledWith(fakeApi.annotation.unhide, { id: 'ann-id' });
  });

  it('reports an error if unhiding the annotation fails', function(done) {
    const ann = moderatedAnnotation({
      flagCount: 1,
      hidden: true,
    });
    const banner = createBanner({ annotation: ann });
    fakeApi.annotation.unhide.returns(
      Promise.reject(new Error('Network Error'))
    );

    banner.querySelector('button').click();

    setTimeout(function() {
      assert.calledWith(fakeFlash.error, 'Failed to unhide annotation');
      done();
    }, 0);
  });
});
