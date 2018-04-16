/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
require('should');
var Stringify = require('../index');

describe('the "getTransformOptions" function', function () {
  function assertObjectInReturnedExtensions () {
    it('should have returned an object', function () {
      this.returned_options.should.be.an.Object;
    });
  }

  function assertCorrectOptionsReturned () {
    it('should have returned the correct extensions', function () {
      this.returned_options.should.eql(this.correct_test_options);
    });
  }

  describe('when passed no options argument', function () {
    before(function () {
      this.correct_test_options = {};
      this.returned_options = Stringify.getTransformOptions();
    });

    assertObjectInReturnedExtensions();
    assertCorrectOptionsReturned();
  });

  describe('when passed an array of file-extensions as an options argument', function () {
    before(function () {
      var test_extensions = ['.cookie', '.cupcake', '.halibut'];

      this.correct_test_options = { appliesTo: { includeExtensions: test_extensions } };
      this.returned_options = Stringify.getTransformOptions(test_extensions);
    });

    assertObjectInReturnedExtensions();
    assertCorrectOptionsReturned();
  });

  describe('when passed an object with an "extensions" array property as an options argument', function () {
    before(function () {
      var test_extensions = ['.trains', '.are', '.fun'];

      this.correct_test_options = { appliesTo: { includeExtensions: test_extensions }, space: 'ship' };

      var test_options = { extensions: test_extensions, space: 'ship' };

      this.returned_options = Stringify.getTransformOptions(test_options);
    });

    assertObjectInReturnedExtensions();
    assertCorrectOptionsReturned();
  });

  describe('when passed an object with an "extensions" Browserify array property as an options argument', function () {
    before(function () {
      var test_extensions = ['.trains', '.are', '.fun'];

      this.correct_test_options = { appliesTo: { includeExtensions: test_extensions }, space: 'ship' };

      var test_options = { extensions: { _: test_extensions }, space: 'ship' };

      this.returned_options = Stringify.getTransformOptions(test_options);
    });

    assertObjectInReturnedExtensions();
    assertCorrectOptionsReturned();
  });

  describe('when passed an object with an "appliesTo" object property as an options argument', function () {
    before(function () {
      this.correct_test_options = { appliesTo: { files: ['.ant', '.frog', '.panda'] }, fruit: 'bowl' };

      this.returned_options = Stringify.getTransformOptions(this.correct_test_options);
    });

    assertObjectInReturnedExtensions();
    assertCorrectOptionsReturned();
  });
});
