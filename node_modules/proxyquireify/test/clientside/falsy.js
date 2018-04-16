'use strict';
/*jshint asi: true, browser: true */

var proxyquire = require('proxyquireify')(require)

test('\nreturns original value with no stub', function (t) {
  var value = proxyquire('../fixtures/value', {})
  t.equals(value, true)
  t.end()
})

test('overriding dep with a false value', function (t) {
  var value = proxyquire('../fixtures/value', { './true': false })
  t.equals(value, false)
  t.end()
})

test('overriding dep with undefined', function (t) {
  var value = proxyquire('../fixtures/value', { './true': undefined })
  t.equals(value, undefined)
  t.end()
})

test('throws with a null value', function (t) {
  t.throws(load, /cannot find module/)
  t.end()

  function load () {
  	proxyquire('../fixtures/value', { './true': null })
  }
})
