'use strict';
/*jshint asi: true, browser: true */

var proxyquire =  require('proxyquireify')(require)
  , file = '/folder/test.ext'
  ;

test('\n# no noCallThru and extname overridden', function (t) {
  var foo = proxyquire('../fixtures/foo', {
    path:{
      extname : function (file) { return 'override ' + file; }
    }
  })
  
  t.equal(foo.bigExt(file), 'OVERRIDE /FOLDER/TEST.EXT', 'extname overridden')
  t.equal(foo.bigBas(file), 'TEST.EXT', 'basename original')
  t.end()
})

test('\n# path noCallThru and extname overridden', function (t) {
  var foo = proxyquire('../fixtures/foo', {
    path:{
        extname : function (file) { return 'override ' + file; }
      , '@noCallThru': true
    }
  })
  
  t.equal(foo.bigExt(file), 'OVERRIDE /FOLDER/TEST.EXT', 'extname overridden')
  t.throws(foo.bigBas.bind(null, file), /TypeError: Object #<Object> has no method 'basename'/, 'basename throws')
  t.end()
})

test('\n# stub wide noCallThru and extname overridden', function (t) {
  var foo = proxyquire('../fixtures/foo', {
    path:{
      extname : function (file) { return 'override ' + file; }
    }
    , '@noCallThru': true
  })
  
  t.equal(foo.bigExt(file), 'OVERRIDE /FOLDER/TEST.EXT', 'extname overridden')
  t.throws(foo.bigBas.bind(null, file), /TypeError: Object #<Object> has no method 'basename'/, 'basename throws')
  t.end()
})

test('\n# stub wide noCallThru but for path noCallThru turned off and extname overridden', function (t) {
  var foo = proxyquire('../fixtures/foo', {
    path:{
        extname : function (file) { return 'override ' + file; }
      , '@noCallThru': false
    }
    , '@noCallThru': true
  })
  
  t.equal(foo.bigExt(file), 'OVERRIDE /FOLDER/TEST.EXT', 'extname overridden')
  t.equal(foo.bigBas(file), 'TEST.EXT', 'basename original')
  t.end()
})
