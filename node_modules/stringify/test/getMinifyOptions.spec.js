/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
require('should');
var Stringify = require('../index');

describe('the "getMinifyOptions" function', function () {

  function assertObjectInReturnedOptions () {
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
      this.correct_test_options = { requested: false };
      this.returned_options = Stringify.getMinifyOptions();
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed empty options argument', function () {
    before(function () {
      this.correct_test_options = { requested: false };
      this.returned_options = Stringify.getMinifyOptions({});
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minify set to false', function () {
    before(function () {
      this.correct_test_options = { requested: false };
      this.returned_options = Stringify.getMinifyOptions({ minify: false });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minify set to true', function () {
    before(function () {
      this.correct_test_options = {
        requested: true,
        options: Stringify.DEFAULT_MINIFY_OPTIONS
      };

      this.returned_options = Stringify.getMinifyOptions({ minify: true });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minifyOptions set', function () {
    before(function () {
      var minifyOptions = { grape: 'fruit' };

      this.correct_test_options = {
        requested: true,
        options: minifyOptions
      };

      this.returned_options = Stringify.getMinifyOptions({
        minify: true,
        minifyOptions: minifyOptions
      });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minifier.options set', function () {
    before(function () {
      var minifierOptions = { sweet: 'tooth' };

      this.correct_test_options = {
        requested: true,
        options: minifierOptions
      };

      this.returned_options = Stringify.getMinifyOptions({
        minify: true,
        minifier: { options: minifierOptions }
      });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minifyAppliesTo set', function () {
    before(function () {
      var minifyAppliesTo = { includeExtensions: ['.car', '.vs', '.train'] };

      this.correct_test_options = {
        requested: true,
        config: { appliesTo: minifyAppliesTo },
        options: Stringify.DEFAULT_MINIFY_OPTIONS
      };

      this.returned_options = Stringify.getMinifyOptions({
        minify: true,
        minifyAppliesTo: minifyAppliesTo
      });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minifier.extensions set', function () {
    before(function () {
      var extensions = ['.top', '.hat'];

      this.correct_test_options = {
        requested: true,
        config: { appliesTo: { includeExtensions: extensions } },
        options: Stringify.DEFAULT_MINIFY_OPTIONS
      };

      this.returned_options = Stringify.getMinifyOptions({
        minify: true,
        minifier: { extensions : extensions }
      });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });

  describe('when passed options argument with minifier.extensions._ set', function () {
    before(function () {
      var extensions = ['.box', '.glove'];

      this.correct_test_options = {
        requested: true,
        config: { appliesTo: { includeExtensions: extensions } },
        options: Stringify.DEFAULT_MINIFY_OPTIONS
      };

      this.returned_options = Stringify.getMinifyOptions({
        minify: true,
        minifier: { extensions : { _: extensions } }
      });
    });

    assertObjectInReturnedOptions();
    assertCorrectOptionsReturned();
  });
});
