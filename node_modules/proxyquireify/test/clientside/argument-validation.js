'use strict';
/*jshint asi: true, browser: true */

var proxyquire =  require('proxyquireify')(require)
  , bar = { bar: function () { return 'bar'; } }

function throws(t, action, regex, desc) {
  t.throws(
      action
    , function (err) {
      return err.name === 'ProxyquireifyError' && regex.test(err.message);
    }
    , desc
  )
}

test('\nillegal parameters give meaningful errors', function (t) {

  throws(
      t
    , proxyquire.bind(null, null, {})
    , /missing argument: "request"/i
    , 'throws for missing request'
  )
  throws(
      t
    , proxyquire.bind(null, {}, bar)
    , /invalid argument: "request".+needs to be a requirable string/i
    , 'throws when request is not a string'
  )
  throws(
      t
    , proxyquire.bind(null, './samples/foo')
    , /missing argument: "stubs".+use regular require instead/i
    , 'throws when no stubs are provided'
  )
  throws(
      t
    , proxyquire.bind(null, '../fixtures/foo', 'stubs')
    , /invalid argument: "stubs".+needs to be an object/i
    , 'throws when a string is passed for stubs'
  )
  t.end()
})

test('\nuninitialized proxyquire', function (t) {
  var uninitialized = require('proxyquireify')
  throws(
      t
    , uninitialized.bind(null, '../fixtures/foo', {})
    , /It seems like you didn't initialize proxyquireify with the require in your test/
    , 'throws when proxyquireify was not initialized with require'
  )
  t.end()      
});
