'use strict';

var prng = require('./prng');
var unroll = require('../../../test/util').unroll;
var randomDom = require('./random-dom');

describe('Random DOM generator', function () {
  describe('generateRandomDOM', function () {
    var el;

    afterEach(function () {
      if (el) {
        el.remove();
      }
    });

    // Generate a set of randomized DOM trees, implicitly check that no
    // exceptions are thrown.
    //
    // The initial seed here is fixed so the same set of DOM trees will be
    // generated on every run.
    var cases = [];
    var genRandom = prng(100);
    for (var i=0; i < 20; i++) {
      cases.push({seed: Math.round(genRandom() * 5000)});
    }

    unroll('generates a randomized DOM', function (testCase) {
      var genRandom = prng(testCase.seed);
      randomDom.generateRandomDOM(genRandom);
    }, cases);
  });

  describe('randomRange', function () {
    var el;

    afterEach(function () {
      if (el) {
        el.remove();
      }
    });

    unroll('generates a randomized range', function (testCase) {
      var genRandom = prng(testCase.seed);
      el = document.createElement('div');
      el.innerHTML = '<div><span></span><div>Foo</div><span>bar</span></div>';
      document.body.appendChild(el);
      var range = randomDom.randomRange(el, genRandom);
      assert.equal(range.toString(), range);
    }, [{
      seed: 100,
      range: 'foobar',
    }]);
  });
});
