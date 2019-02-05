'use strict';

const angular = require('angular');
const unroll = require('../../../shared/test/util').unroll;

describe('BrandingDirective', function() {
  let $compile;
  let $rootScope;
  let customSettings;

  // Settings are set and frozen when the app initializes.
  // This function allows us a way to quickly setup our environment
  // with desired settings. Note, needs to be called for angular
  // to be initialized for the test
  const setSettingsAndBootApp = function() {
    angular.module('app', []).directive('hBranding', require('../h-branding'));

    angular.mock.module('app', {
      settings: customSettings || {},
    });

    angular.mock.inject(function(_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  };

  // convenience method to only worry about what the test
  // should be doing, applying settings variants.
  const applyBrandingSettings = function(brandingSettings) {
    customSettings = brandingSettings
      ? {
          branding: brandingSettings,
        }
      : null;

    setSettingsAndBootApp();
  };

  // creates a new element with the attribute string provided.
  // Allowing us to do many attribute configurations before
  // compilation happens.
  const makeElementWithAttrs = function(attrString) {
    const $element = angular.element('<span ' + attrString + ' ></span>');
    $compile($element)($rootScope.$new());
    $rootScope.$digest();
    return $element;
  };

  afterEach(function() {
    customSettings = {};
  });

  it('branding should not happen on elements with unknown branding attributes', function() {
    // note, we need to set some form of branding settings or this
    // test will pass simply because branding isn't required
    applyBrandingSettings({
      appBackgroundColor: 'blue',
    });

    const el = makeElementWithAttrs('h-branding="randomBackgroundColor"');
    assert.equal(el[0].style.backgroundColor, '');
  });

  unroll(
    'applies branding to elements',
    function(testCase) {
      applyBrandingSettings(testCase.settings);

      const el = makeElementWithAttrs(testCase.attrs);

      if (Array.isArray(testCase.styleChanged)) {
        // we expect that if styleChanged is an array
        // that expectedPropValue will be an equal length array
        testCase.styleChanged.forEach(function(styleChanged, index) {
          assert.equal(
            el[0].style[styleChanged],
            testCase.expectedPropValue[index]
          );
        });
      } else {
        assert.equal(
          el[0].style[testCase.styleChanged],
          testCase.expectedPropValue
        );
      }
    },
    require('./h-branding-fixtures')
  );
});
