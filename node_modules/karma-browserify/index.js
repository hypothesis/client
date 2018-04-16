'use strict';

var Bro = require('./lib/bro');

function framework(injector, bro) {
  return injector.invoke(bro.framework);
}

function testFilePreprocessor(injector, bro) {
  return injector.invoke(bro.testFilePreprocessor);
}

function bundlePreprocessor(injector, bro) {
  return injector.invoke(bro.bundlePreprocessor);
}

module.exports = {
  'bro': [ 'type', Bro ],
  'framework:browserify': [ 'factory', framework ],
  'preprocessor:browserify': [ 'factory', testFilePreprocessor ],
  'preprocessor:browserify-bundle': [ 'factory', bundlePreprocessor ]
};


// override the default preprocess factory to add our
// preprocessor for *.browserify files

try {
  module.exports.preprocess = [ 'factory', require('./lib/preprocessor').createPreprocessor ];
} catch (e) {
  console.warn('failed to add custom browserify preprocessor');
  console.warn(e);
}