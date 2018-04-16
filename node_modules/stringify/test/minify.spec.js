/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
require('should');
var path      = require('path'),
    fs        = require('fs'),
    Stringify = require('../index');

function requireHtml(filename) {
  return fs.readFileSync(path.join(path.dirname('.'), 'test', filename), 'utf8');
}

describe('the "minify" function', function () {
  before(function () {
    this.givenHtml = requireHtml('minify.given.html');
    this.expectedHtml = requireHtml('minify.expected.html').replace(/\r?\n|\r/, '');
  });

  it('should return a function', function () {
    Stringify.minify.should.be.a.Function;
  });

  it('should have default minifier extensions', function () {
    var extensions = Stringify.MINIFY_TRANSFORM_OPTIONS;
    extensions.should.be.an.Object;
    extensions.includeExtensions.should.be.an.Array;
    extensions.includeExtensions.length.should.be.exactly(5);
  });

  it('should minify html content', function () {
    Stringify.minify('some.html', this.givenHtml, {
      minify: true
    }).should.be.exactly(this.expectedHtml);
  });

  it('should not minify html content when minification is not requested', function () {
    Stringify.minify('some.html', this.givenHtml, {
      minify: false
    }).should.be.exactly(this.givenHtml);
  });

  it('should not minify html content when extension is excluded', function () {
    Stringify.minify('some.html', this.givenHtml, {
      minify: true,
      minifyAppliesTo: { includeExtensions: ['.foo'] }
    }).should.be.exactly(this.givenHtml);
  });

  it('should minify custom content when extension is included', function () {
    Stringify.minify('some.ant', this.givenHtml, {
      minify: true,
      minifyAppliesTo: { includeExtensions: ['.ant'] }
    }).should.be.exactly(this.expectedHtml);
  });

  it('should not minify custom content when extension is excluded', function () {
    Stringify.minify('some.soap', this.givenHtml, {
      minify: true,
      minifyAppliesTo: { includeExtensions: ['.xml'] }
    }).should.be.exactly(this.givenHtml);
  });
});
