'use strict';
/*jshint asi: true, browser: true */

var proxyquire =  require('proxyquireify')(require)
  , barber     =  { bar: function () { return 'barber'; } }
  ;

var foober =  proxyquire('../fixtures/foo', { './bar': barber });

test('\noverriding dep with stub and manipulating stub afterwards', function (t) {

  barber.bar = function () { return 'friseur'; }
  barber.rab = function () { return 'rabarber'; }

  t.equal(foober.bigBar(), 'FRISEUR', 'overrides previously stubbed func');
  t.equal(foober.bigRab(), 'RABARBER', 'overrides func not previously stubbed');

  barber.bar = undefined;

  t.throws(foober.bigBar, /Property 'bar' of object #<Object> is not a function/, 'returns undefined when I delete an override later')  
  t.end()
})
