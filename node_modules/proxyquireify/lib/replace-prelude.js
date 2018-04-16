'use strict';

var bpack = require('browser-pack');
var fs = require('fs');
var path = require('path');
var xtend = require('xtend');

var preludePath = path.join(__dirname, 'prelude.js');
var prelude = fs.readFileSync(preludePath, 'utf8');

// This plugin replaces the prelude and adds a transform
var plugin = exports.plugin = function (bfy, opts) {
  function replacePrelude() {
    var packOpts = {
      raw         : true, // Added in regular Browserifiy as well
      preludePath : preludePath,
      prelude     : prelude
    };

    // browserify sets "hasExports" directly on bfy._bpack
    bfy._bpack = bpack(xtend(bfy._options, packOpts, {hasExports: bfy._bpack.hasExports}));
    // Replace the 'pack' sub-pipeline with the new browser-pack instance
    bfy.pipeline.get('pack').splice(0, 1, bfy._bpack);
  }

  bfy.transform(require('./transform'));
  bfy.on('reset', replacePrelude);
  
  replacePrelude();
};

// Maintain support for the old interface
exports.browserify = function (files) {
  console.error('You are setting up proxyquireify via the old API which will be deprecated in future versions.');
  console.error('It is recommended to use it as a browserify-plugin instead - see the example in the README.');
  return require('browserify')(files).plugin(plugin);
};
