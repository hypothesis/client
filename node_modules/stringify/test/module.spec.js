/* jshint expr: true */
/* global describe: false, it: false */
'use strict';
var stringify = require('../index');

describe('when the module is required', function () {
  it('should return a function', function () {
    stringify.should.be.a.Function;
  });

  it('should have a method "registerWithRequire"', function () {
    stringify.registerWithRequire.should.be.a.Function;
  });
});
