'use strict';

var angular = require('angular');
var proxyquire = require('proxyquire');

var fixtures = require('../../test/annotation-fixtures');

var fakeDocumentMeta = {
  domain: 'docs.io',
  titleLink: 'http://docs.io/doc.html',
  titleText: 'Dummy title',
};

describe('sidebar.components.annotation-header', function () {
  var $componentController;
  var fakeGroups;
  var fakeSettings = { usernameUrl: 'http://www.example.org/' };
  var fakeServiceUrl;

  before(function () {
    var annotationHeader = proxyquire('../annotation-header', {
      '../annotation-metadata': {
        domainAndTitle: function (ann) { // eslint-disable-line no-unused-vars
          return fakeDocumentMeta;
        },
      },
    });

    angular.module('app', [])
      .component('annotationHeader', annotationHeader);
  });

  beforeEach(function () {
    angular.mock.module('app', {
      groups: fakeGroups,
      settings: fakeSettings,
      serviceUrl: fakeServiceUrl,
    });

    angular.mock.inject(function (_$componentController_) {
      $componentController = _$componentController_;
    });
  });

  describe('sidebar.components.AnnotationHeaderController', function () {
    describe('#htmlLink()', function () {
      it('returns the HTML link when available', function () {
        var ann = fixtures.defaultAnnotation();
        ann.links = { html: 'https://annotation.service/123' };
        var ctrl = $componentController('annotationHeader', {}, {
          annotation: ann,
        });
        assert.equal(ctrl.htmlLink(), ann.links.html);
      });

      it('returns an empty string when no HTML link is available', function () {
        var ann = fixtures.defaultAnnotation();
        ann.links = {};
        var ctrl = $componentController('annotationHeader', {}, {
          annotation: ann,
        });
        assert.equal(ctrl.htmlLink(), '');
      });
    });

    describe('#documentMeta()', function () {
      it('returns the domain, title link and text for the annotation', function () {
        var ann = fixtures.defaultAnnotation();
        var ctrl = $componentController('annotationHeader', {}, {
          annotation: ann,
        });
        assert.deepEqual(ctrl.documentMeta(), fakeDocumentMeta);
      });
    });

    describe('#displayName', () => {
      [
        {
          context: 'when the api_render_user_info feature flag is turned off in h',
          it: 'returns the username',
          user_info: undefined,
          expectedResult: 'bill',
        },
        {
          context: 'when the api_render_user_info feature flag is on and ' +
                   "the user has a display_name",
          it: 'returns the display_name',
          user_info: { display_name: 'Bill Jones' },
          expectedResult: 'Bill Jones',
        },
      ].forEach(function(test) {
        context(test.context, function() {
          it(test.it, function() {
            var ann = fixtures.defaultAnnotation();
            ann.user_info = test.user_info;

            var ctrl = $componentController('annotationHeader', {}, {
              annotation: ann,
            });

            assert.equal(ctrl.displayName(), test.expectedResult);
          });
        });
      });
    });

    describe('#thirdPartyUsernameLink', () => {
      it('returns the custom username link if set', () => {
        var ann;
        var ctrl;

        fakeSettings.usernameUrl = 'http://www.example.org/';
        ann = fixtures.defaultAnnotation();
        ctrl = $componentController('annotationHeader', {}, {
          annotation: ann,
        });
        assert.deepEqual(ctrl.thirdPartyUsernameLink(), 'http://www.example.org/bill');
      });

      it('returns null if no custom username link is set in the settings object', () => {
        var ann;
        var ctrl;

        fakeSettings.usernameUrl = null;
        ann = fixtures.defaultAnnotation();
        ctrl = $componentController('annotationHeader', {}, {
          annotation: ann,
        });
        assert.deepEqual(ctrl.thirdPartyUsernameLink(), null);
      });
    });
  });
});
