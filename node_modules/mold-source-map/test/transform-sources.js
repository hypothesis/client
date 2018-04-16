'use strict';
/*jshint asi: true */

var test =        require('tap').test
  , path       =  require('path')
  , fs         =  require('fs')
  , browserify =  require('browserify')
  , convert    =  require('convert-source-map')
  , mold       =  require('..')
  , jsRoot     =  path.join(__dirname, '..', 'examples', 'project')

test('mold sources', function (t) {
  t.plan(4)

  var bundle = '';
  browserify({ debug: true })
    .require(require.resolve('../examples/project/js/main.js'), { entry: true })
    .bundle()
    .pipe(mold.transformSourcesRelativeTo(jsRoot))
    .on('error', function (err) { console.error(err); })
    .on('data', function (data) {
      bundle += data;    
    })
    .on('end', function () {
      var sm = convert.fromSource(bundle);
      var sources = sm.getProperty('sources')
        .filter(function(source) {
          // exclude browserify's prelude
          return !/_prelude\.js$/.test(source);
        });

      t.equal(sources.length, 3, 'molds 3 sources')
      t.ok(~sources.indexOf('js/main.js'), 'molds main.js relative to root')
      t.ok(~sources.indexOf('js/foo.js'), 'molds foo.js relative to root')
      t.ok(~sources.indexOf('js/wunder/bar.js'), 'molds wunder/bar.js relative to root')
    });
});
