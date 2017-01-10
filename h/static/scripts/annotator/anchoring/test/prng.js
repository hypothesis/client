'use strict';

// XorShift128+ is the PRNG algorithm used by recent versions of V8
var XorShift = require('xorshift').constructor;

/**
 * Return a PRNG initialized with a given seed.
 *
 * @param {number} seed - Integer >= 0 used as the seed for the PRNG
 * @return {() => number} - PRNG function with the same API as Math.random()
 */
function prng(seed) {
  // XorShift constructor requires 4 integers as the need, here we perform some
  // arbitrarily chosen operations on the input integer
  var seedList = [seed, seed << 5, seed * 149, seed * 79];
  var prng = new XorShift(seedList);
  // FIXME - Works around initial value too often being very small (why does
  // this happen?)
  prng.random();
  return prng.random.bind(prng);
}

module.exports = prng;
