'use strict';
/*jshint asi: true */

var browserify =  require('browserify');
var proxyquire =  require('../..');
var vm         =  require('vm');
var test       =  require('tape');

function compile(name, cb) {
  browserify()
    .plugin(proxyquire.plugin)
    .require(require.resolve('../..'), { expose: 'proxyquireify' })
    .require(require.resolve('./' + name), { entry: true })
    .bundle(function (err, src) {
      if (err) return cb(err);
      cb(null, { src: src, name: name });
    });
}

// run the compiled tests in a new context
function run(args) {
  var name = args.name;
  var src  = args.src;

  test(name, function(t) {
    vm.runInNewContext(src, { test: t.test.bind(t), window: {} });
  })
}

// compile all tests and fire a callback when the
// all code is compiled and ready to be executed
function compileAll(tests, cb) {
  var results = [];
  var pending = tests.length;
  tests.forEach(function (name, idx) {
    compile(name, function (err, result) {
      if (err) return cb(err);

      results[idx] = result;
      if (--pending === 0) {
        cb(null, results);
      }
    });
  });
}

var clientTests = [
    'independent-overrides'
  , 'manipulating-overrides'
  , 'noCallThru'
  , 'argument-validation'
  , 'falsy'
];

compileAll(clientTests, function (err, results) {
  if (err) {
    console.error(err);
    process.exit(1);
    return;
  }
  results.forEach(run);
});
