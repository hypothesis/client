'use strict';

var bar = require('./bar');

var go = module.exports = function () {
  console.log(bar());  
};
