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
  var fakeFeatures;
  var fakeGroups;
  var fakePersona;
  var fakeSettings = { usernameUrl: 'http://www.example.org/' };
  var fakeServiceUrl;

  beforeEach('Initialize fakePersona', () => {
    fakePersona = {
      username: sinon.stub().returns('TEST_USERNAME'),
    };
  });

  beforeEach('Import and register the annotationHeader component', function () {
    var annotationHeader = proxyquire('../annotation-header', {
      '../annotation-metadata': {
        domainAndTitle: function (ann) { // eslint-disable-line no-unused-vars
          return fakeDocumentMeta;
        },
      },
      '../filter/persona': fakePersona,
      '@noCallThru': true,
    });

    angular.module('app', [])
      .component('annotationHeader', annotationHeader);
  });

  beforeEach('Initialize and register fake AngularJS dependencies', function () {
    fakeFeatures = {
      flagEnabled: sinon.stub().returns(false),
    };

    angular.mock.module('app', {
      features: fakeFeatures,
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
          client_display_names: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when the api_render_user_info feature flag is turned off in h',
          it: 'returns the username even if the client_display_names feature flag is on',
          user_info: undefined,
          client_display_names: true,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when the client_display_names feature flag is off in h',
          it: 'returns the username',
          user_info: { display_name: null },
          client_display_names: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when the client_display_names feature flag is off in h',
          it: 'returns the username even if the user has a display name',
          user_info: { display_name: 'Bill Jones' },
          client_display_names: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when both feature flags api_render_user_info and ' +
                   'client_display_names are on',
          it: 'returns the username, if the user has no display_name',
          user_info: { display_name: null },
          client_display_names: true,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when both feature flags api_render_user_info and ' +
                   'client_display_names are on',
          it: 'returns the display_name, if the user has one',
          user_info: { display_name: 'Bill Jones' },
          client_display_names: true,
          expectedResult: 'Bill Jones',
        },
      ].forEach((test) => {
        context(test.context, () => {
          it(test.it, () => {
            fakeFeatures.flagEnabled = (flag) => {
              if (flag === 'client_display_names') {
                return test.client_display_names;
              }
              return false;
            };
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
        assert.deepEqual(ctrl.thirdPartyUsernameLink(), 'http://www.example.org/TEST_USERNAME');
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
