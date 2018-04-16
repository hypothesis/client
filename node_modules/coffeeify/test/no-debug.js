var test = require('tap').test;

test('sourceMap use', function (t) {

  t.plan(2);

  defaultCoffeeify = require(__dirname + '/..');
  t.equal(defaultCoffeeify.sourceMap, true, "sourceMap is true by default");

  noDebugCoffeeify = require(__dirname + '/../no-debug');
  t.equal(noDebugCoffeeify.sourceMap, false, "sourceMap is false for no-debug");

});

