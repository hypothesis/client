'use strict';

const angular = require('angular');

const fixtures = require('../../test/annotation-fixtures');
const annotationHeader = require('../annotation-header');

const fakeDocumentMeta = {
  domain: 'docs.io',
  titleLink: 'http://docs.io/doc.html',
  titleText: 'Dummy title',
};

describe('sidebar.components.annotation-header', function() {
  let $componentController;
  let fakeFeatures;
  let fakeGroups;
  let fakeAccountID;
  const fakeSettings = { usernameUrl: 'http://www.example.org/' };
  let fakeServiceUrl;

  beforeEach('Initialize fakeAccountID', () => {
    fakeAccountID = {
      isThirdPartyUser: sinon.stub().returns(false),
      username: sinon.stub().returns('TEST_USERNAME'),
    };
  });

  beforeEach('Import and register the annotationHeader component', function() {
    annotationHeader.$imports.$mock({
      '../annotation-metadata': {
        // eslint-disable-next-line no-unused-vars
        domainAndTitle: function(ann) {
          return fakeDocumentMeta;
        },
      },
      '../util/account-id': fakeAccountID,
    });
    angular.module('app', []).component('annotationHeader', annotationHeader);
  });

  afterEach(() => {
    annotationHeader.$imports.$restore();
  });

  beforeEach('Initialize and register fake AngularJS dependencies', function() {
    fakeFeatures = {
      flagEnabled: sinon.stub().returns(false),
    };

    angular.mock.module('app', {
      features: fakeFeatures,
      groups: fakeGroups,
      settings: fakeSettings,
      serviceUrl: fakeServiceUrl,
    });

    angular.mock.inject(function(_$componentController_) {
      $componentController = _$componentController_;
    });
  });

  describe('sidebar.components.AnnotationHeaderController', function() {
    describe('#htmlLink()', function() {
      it('returns the HTML link when available', function() {
        const ann = fixtures.defaultAnnotation();
        ann.links = { html: 'https://annotation.service/123' };
        const ctrl = $componentController(
          'annotationHeader',
          {},
          {
            annotation: ann,
          }
        );
        assert.equal(ctrl.htmlLink(), ann.links.html);
      });

      it('returns an empty string when no HTML link is available', function() {
        const ann = fixtures.defaultAnnotation();
        ann.links = {};
        const ctrl = $componentController(
          'annotationHeader',
          {},
          {
            annotation: ann,
          }
        );
        assert.equal(ctrl.htmlLink(), '');
      });
    });

    describe('#documentMeta()', function() {
      it('returns the domain, title link and text for the annotation', function() {
        const ann = fixtures.defaultAnnotation();
        const ctrl = $componentController(
          'annotationHeader',
          {},
          {
            annotation: ann,
          }
        );
        assert.deepEqual(ctrl.documentMeta(), fakeDocumentMeta);
      });
    });

    describe('#displayName', () => {
      [
        {
          context:
            'when the api_render_user_info feature flag is turned off in h',
          it: 'returns the username',
          user_info: undefined,
          client_display_names: false,
          isThirdPartyUser: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context:
            'when the api_render_user_info feature flag is turned off in h',
          it:
            'returns the username even if the client_display_names feature flag is on',
          user_info: undefined,
          client_display_names: true,
          isThirdPartyUser: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when the client_display_names feature flag is off in h',
          it: 'returns the username',
          user_info: { display_name: null },
          client_display_names: false,
          isThirdPartyUser: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context: 'when the client_display_names feature flag is off in h',
          it: 'returns the username even if the user has a display name',
          user_info: { display_name: 'Bill Jones' },
          client_display_names: false,
          isThirdPartyUser: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context:
            'when both feature flags api_render_user_info and ' +
            'client_display_names are on',
          it: 'returns the username, if the user has no display_name',
          user_info: { display_name: null },
          client_display_names: true,
          isThirdPartyUser: false,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context:
            'when both feature flags api_render_user_info and ' +
            'client_display_names are on',
          it: 'returns the display_name, if the user has one',
          user_info: { display_name: 'Bill Jones' },
          client_display_names: true,
          isThirdPartyUser: false,
          expectedResult: 'Bill Jones',
        },
        {
          context:
            'when the client_display_names feature flag is off but ' +
            'the user is a third-party user',
          it: 'returns display_name even though client_display_names is off',
          user_info: { display_name: 'Bill Jones' },
          client_display_names: false,
          isThirdPartyUser: true,
          expectedResult: 'Bill Jones',
        },
        {
          context:
            'when client_display_names is on and the user is a ' +
            'third-party user',
          it: 'returns the display_name',
          user_info: { display_name: 'Bill Jones' },
          client_display_names: true,
          isThirdPartyUser: true,
          expectedResult: 'Bill Jones',
        },
        {
          context:
            'when the user is a third-party user but the ' +
            'api_render_user_info feature flag is turned off in h',
          it: 'returns the username',
          user_info: undefined,
          client_display_names: true,
          isThirdPartyUser: true,
          expectedResult: 'TEST_USERNAME',
        },
        {
          context:
            "when the user is a third-party user but doesn't have a " +
            'display_name',
          it: 'returns the username',
          user_info: { display_name: null },
          client_display_names: true,
          isThirdPartyUser: true,
          expectedResult: 'TEST_USERNAME',
        },
      ].forEach(test => {
        context(test.context, () => {
          it(test.it, () => {
            // Make features.flagEnabled('client_display_names') return true
            // or false, depending on the test case.
            fakeFeatures.flagEnabled = flag => {
              if (flag === 'client_display_names') {
                return test.client_display_names;
              }
              return false;
            };

            // Make isThirdPartyUser() return true or false,
            // depending on the test case.
            fakeAccountID.isThirdPartyUser.returns(test.isThirdPartyUser);

            const ann = fixtures.defaultAnnotation();
            ann.user_info = test.user_info;

            const ctrl = $componentController(
              'annotationHeader',
              {},
              {
                annotation: ann,
              }
            );

            assert.equal(ctrl.displayName(), test.expectedResult);
          });
        });
      });
    });

    describe('#thirdPartyUsernameLink', () => {
      it('returns the custom username link if set', () => {
        let ann;
        let ctrl;

        fakeSettings.usernameUrl = 'http://www.example.org/';
        ann = fixtures.defaultAnnotation();
        ctrl = $componentController(
          'annotationHeader',
          {},
          {
            annotation: ann,
          }
        );
        assert.deepEqual(
          ctrl.thirdPartyUsernameLink(),
          'http://www.example.org/TEST_USERNAME'
        );
      });

      it('returns null if no custom username link is set in the settings object', () => {
        let ann;
        let ctrl;

        fakeSettings.usernameUrl = null;
        ann = fixtures.defaultAnnotation();
        ctrl = $componentController(
          'annotationHeader',
          {},
          {
            annotation: ann,
          }
        );
        assert.deepEqual(ctrl.thirdPartyUsernameLink(), null);
      });
    });
  });
});
