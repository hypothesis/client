'use strict';

// Disable options that don't work in Node.js 0.12.
// Gruntfile.js & tasks/*.js are the only non-transpiled files.
/* eslint-disable no-var, no-eval */

var assert = require('assert');

var newNode;
try {
    assert.strictEqual(eval('((...r) => [...r])(2)[0]'), 2);
    newNode = true;
} catch (e) {
    newNode = false;
}

module.exports = newNode ?
    require('./lib/check-dependencies') :
    require('./dist/lib/check-dependencies');
