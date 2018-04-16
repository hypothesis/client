/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
var should    = require('should'),
    stream    = require('stream'),
    tools     = require('browserify-transform-tools'),
    stringify = require('../index');

describe('the main function called', function () {
  var input = '<p   style="color: grey;"   >   should   be   minified   </p>',
      outputTransformed = 'module.exports = \"<p   style=\\"color: grey;\\"   >   should   be   minified   </p>";\n',
      outputMinified = 'module.exports = \"<p style=\\"color: grey\\">should be minified</p>";\n';

  function assertFactoryFunctionReturnsOneArgument () {
    it('should return a factory function that expects one argument', function () {
      should(this.transformerFactory.length).be.equal(1);
    });
  }

  function assertFactoryFunctionReturnsStreamWhenSuppliedValidFile () {
    describe('when the returned function is called with a valid file path', function () {
      before(function () {
        this.transformer = this.transformerFactory('a_file.xxx');
      });

      it('should return a Stream object', function () {
        should(this.transformer).be.instanceOf(stream.Stream);
        should(this.transformer.writable).ok;
        should(this.transformer.readable).ok;
        this.transformer.write.should.be.a.Function;
        this.transformer.end.should.be.a.Function;
      });
    });
  }

  describe('with no options', function () {
    before(function () {
      this.transformConfig = {
        content: input
      };
      this.transformerFactory = stringify();
    });

    assertFactoryFunctionReturnsOneArgument();
    assertFactoryFunctionReturnsStreamWhenSuppliedValidFile();

    it('should respond to input with the default options', function (done) {
      tools.runTransform(this.transformerFactory, 'a_file.txt', this.transformConfig, function(err, result) {
        should(err).be.null;
        should(result).be.equal(outputTransformed);
        done();
      });
    });

    it('should respond without transformation when should be file skipped', function (done) {
      tools.runTransform(this.transformerFactory, 'a_file.foo', this.transformConfig, function(err, result) {
        should(err).be.null;
        should(result).be.equal(input);
        done();
      });
    });
  });

  describe('with options as first argument', function () {
    before(function () {
      this.transformConfig = {
        content: input
      };
      this.transformerFactory = stringify({
        appliesTo: { includeExtensions: ['.xxx'] },
        minify: true,
        minifyAppliesTo: {
          includeExtensions: ['.xxx']
        }
      });
    });

    assertFactoryFunctionReturnsOneArgument();
    assertFactoryFunctionReturnsStreamWhenSuppliedValidFile();

    it('should respond to input with the given options', function (done) {
      tools.runTransform(this.transformerFactory, 'a_file.xxx', this.transformConfig, function(err, result) {
        should(err).be.null;
        should(result).be.equal(outputMinified);
        done();
      });
    });

    it('should respond without transformation when should be file skipped', function (done) {
      tools.runTransform(this.transformerFactory, 'a_file.foo', this.transformConfig, function(err, result) {
        should(err).be.null;
        should(result).be.equal(input);
        done();
      });
    });
  });

  describe('with file as first argument', function () {
    before(function () {
      this.transformConfig = {
        content: input,
        config: {
          appliesTo: { includeExtensions: ['.xxx'] }
        }
      };
    });

    describe('when called with a valid file path and options', function () {
      before(function () {
        this.transformer = stringify('a_file', this.transformConfig.config);
      });

      it('should return a Stream object', function () {
        should(this.transformer).be.instanceOf(stream.Stream);
        should(this.transformer.writable).ok;
        should(this.transformer.readable).ok;
        this.transformer.write.should.be.a.Function;
        this.transformer.end.should.be.a.Function;
      });
    });

    it('should respond to input with the given options', function (done) {
      tools.runTransform(stringify, 'a_file.xxx', this.transformConfig, function(err, result) {
        should(err).be.null;
        should(result).be.equal(outputTransformed);
        done();
      });
    });

    it('should respond without transformation when should be file skipped', function (done) {
      tools.runTransform(stringify, 'a_file.foo', this.transformConfig, function(err, result) {
        should(err).be.null;
        should(result).be.equal(input);
        done();
      });
    });
  });
});
