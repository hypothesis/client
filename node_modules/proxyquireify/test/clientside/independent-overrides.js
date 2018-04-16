'use strict';
/*jshint asi: true, browser: true */

var proxyquire =  require('proxyquireify')(require)
  , stats      =  require('../fixtures/stats')
  , barber     =  { bar: function () { return 'barber'; } }
  ;

var foober =  proxyquire('../fixtures/foo', { './bar': barber });
var foo    =  proxyquire('../fixtures/foo', { './bar': { } });

test('\noverriding bar.bar for foober but not for foo', function (t) {
  t.equal(window.foostats.fooRequires(), 2, 'foo is required three times since one for each test and one for require detective')
  t.equal(foo.bigBar(), 'BAR', 'foo.bigBar == BAR')  
  t.equal(foober.bigBar(), 'BARBER', 'foober.bigBar == BARBER');

  t.equal(foober.bigExt('file.ext'), '.EXT', 'does not override bar.ext for foober')
  t.equal(foober.bigBas('/home/file.ext'), 'FILE.EXT', 'does not override bar.basename for foober')
  t.end()
})
