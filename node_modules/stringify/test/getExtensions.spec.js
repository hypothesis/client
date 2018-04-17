/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
require('should');
var Stringify = require('../index');

describe('the "getExtensions" function', function () {
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
      this.returned_extensions = Stringify.getExtensions();
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });

  describe('when passed an array of file-extensions as an options argument', function () {
    before(function () {
      this.correct_test_extensions = ['.cookie', '.cupcake', '.halibut'];
      this.returned_extensions = Stringify.getExtensions(this.correct_test_extensions);
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });

  describe('when passed an object with an "extensions" array property as an options argument', function () {
    before(function () {
      this.correct_test_extensions = ['.trains', '.are', '.fun'];

      var test_object = { extensions: this.correct_test_extensions };

      this.returned_extensions = Stringify.getExtensions(test_object);
    });

    assertNonEmptyArrayInReturnedExtensions();
    assertCorrectExtensionsReturned();
  });
});
