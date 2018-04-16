/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
require('should');
var Stringify = require('../index');

describe('the "getRequireExtensions" function', function () {
  function assertNonEmptyArrayInReturnedExtensions () {
    it('should have returned a non-empty array', function () {
      this.returned_extensions.should.be.an.Array;
      this.returned_extensions.should.not.be.empty;
    });
  }

  function assertCorrectExtensionsReturned () {
    it('should have returned the correct extensions', function () {
      this.returned_extensions.should.eql(this.correct_test_extensions);
    });
  }

  describe('when passed no options argument', function () {
    before(function () {
      this.correct_test_extensions = Stringify.TRANSFORM_OPTIONS.includeExtensions;
      this.returned_extensions = Stringify.getRequireExtensions();
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });

  describe('when passed empty object options argument', function () {
    before(function () {
      this.correct_test_extensions = Stringify.TRANSFORM_OPTIONS.includeExtensions;
      this.returned_extensions = Stringify.getRequireExtensions({});
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });

  describe('when passed an object with an "appliesTo.includeExtensions" property as an options argument', function () {
    before(function () {
      var extensions = ['.trains', '.are', '.fun'],
          test_object = { appliesTo: { includeExtensions: extensions } };

      this.correct_test_extensions = extensions;
      this.returned_extensions = Stringify.getRequireExtensions(test_object);
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });

  describe('when passed an object with an "appliesTo.includeExtensions" property with mixed casing', function () {
    before(function () {
      var extensions = ['.BUS', '.laNE'],
          test_object = { appliesTo: { includeExtensions: extensions } },
          lowerCasedExtensions = ['.bus', '.lane'];

      this.correct_test_extensions = lowerCasedExtensions;
      this.returned_extensions = Stringify.getRequireExtensions(test_object);
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });
});
