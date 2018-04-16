/* jshint expr: true */
/* global describe: false, it: false, before: false */
'use strict';
require('should');
var Stringify = require('../index');

describe('the "registerWithRequire" function', function () {
  before(function () {
    Stringify.registerWithRequire();
  });

  it('should allow me to require "./file_fixture.txt" as strings', function () {
    require('./file_fixture.txt').should.be.a.String;
  });
});
