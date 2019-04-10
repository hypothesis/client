'use strict';

const angular = require('angular');

const util = require('../../directive/test/util');

describe('annotationShareDialog', function() {
  let element;
  let fakeAnalytics;

  function getCopyBtn() {
    return element.find('.annotation-share-dialog-link__btn');
  }

  before(function() {
    fakeAnalytics = {
      track: sinon.stub(),
      events: {},
    };
    angular
      .module('app', [])
      .component('annotationShareDialog', require('../annotation-share-dialog'))
      .value('analytics', fakeAnalytics)
      .value('urlEncodeFilter', function(val) {
        return val;
      });
  });

  beforeEach(function() {
    angular.mock.module('app');
  });

  describe('the share dialog', function() {
    it('has class is-open set when it is open', function() {
      element = util.createDirective(document, 'annotationShareDialog', {
        isOpen: true,
      });

      assert.isOk(element.find('.annotation-share-dialog').hasClass('is-open'));
    });

    it('does not have class is-open set when it is not open', function() {
      element = util.createDirective(document, 'annotationShareDialog', {
        isOpen: false,
      });

      assert.isNotOk(
        element.find('.annotation-share-dialog').hasClass('is-open')
      );
    });

    it('tracks the target being shared', function() {
      const clickShareIcon = function(iconName) {
        element.find('.' + iconName).click();
      };

      element = util.createDirective(document, 'annotationShareDialog', {
        isOpen: true,
      });

      clickShareIcon('h-icon-twitter');
      assert.equal(fakeAnalytics.track.args[0][1], 'twitter');
      clickShareIcon('h-icon-facebook');
      assert.equal(fakeAnalytics.track.args[1][1], 'facebook');
      clickShareIcon('h-icon-mail');
      assert.equal(fakeAnalytics.track.args[2][1], 'email');
    });

    it('focuses and selects the link when the dialog is opened', function(done) {
      const uri = 'https://hyp.is/a/foo';
      element = util.createDirective(document, 'annotationShareDialog', {
        isOpen: true,
        uri: uri,
      });

      setTimeout(function() {
        const shareLink = element.find('input')[0];
        assert.equal(document.activeElement, shareLink);
        assert.equal(shareLink.selectionStart, 0);
        assert.equal(shareLink.selectionEnd, uri.length);
        done();
      }, 1);
    });
  });

  describe('clipboard copy button', function() {
    let stub;

    beforeEach(function() {
      stub = sinon.stub(document, 'execCommand').returns(true);
      element = util.createDirective(document, 'annotationShareDialog', {
        group: {
          name: 'Public',
          type: 'open',
        },
        uri: 'fakeURI',
        isPrivate: false,
      });
    });

    afterEach(function() {
      stub.restore();
    });

    it('displays message after successful copy', function() {
      const expectedMessage = 'Link copied to clipboard!';

      getCopyBtn().click();

      const actualMessage = element
        .find('.annotation-share-dialog-link__feedback')
        .text();
      assert.include(actualMessage, expectedMessage);
    });

    it('hides message after a delay after a successful copy', function() {
      const clock = sinon.useFakeTimers();
      const expectedMessage = 'Link copied to clipboard!';

      getCopyBtn().click();

      clock.tick(1999);
      clock.restore();

      const actualMessage = element
        .find('.annotation-share-dialog-link__feedback')
        .text();
      assert.notInclude(actualMessage, expectedMessage);
    });

    it('displays message after failed copy', function() {
      stub.returns(false);
      const expectedMessage = 'Select and copy to share';

      getCopyBtn().click();

      const actualMessage = element
        .find('.annotation-share-dialog-link__feedback')
        .text();
      assert.include(actualMessage, expectedMessage);
    });
  });

  describe('The message when a user wants to share an annotation shows that the annotation', function() {
    it('is available to a group', function() {
      element = util.createDirective(document, 'annotationShareDialog', {
        group: {
          type: 'private',
        },
        isPrivate: false,
      });

      const actualMessage = element.find('.annotation-share-dialog-msg').text();
      const actualAudience = element
        .find('.annotation-share-dialog-msg__audience')
        .text();
      const expectedMessage =
        'Only group members will be able to view this annotation.';
      const expectedAudience = 'Group.';
      assert.include(actualMessage, expectedMessage);
      assert.include(actualAudience, expectedAudience);
    });

    it('is private', function() {
      element = util.createDirective(document, 'annotationShareDialog', {
        isPrivate: true,
      });

      const actualMessage = element.find('.annotation-share-dialog-msg').text();
      const actualAudience = element
        .find('.annotation-share-dialog-msg__audience')
        .text();
      const expectedMessage =
        'No one else will be able to view this annotation.';
      const expectedAudience = 'Only me.';
      assert.include(actualMessage, expectedMessage);
      assert.include(actualAudience, expectedAudience);
    });
  });
});
