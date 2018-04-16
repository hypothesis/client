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
  t.plan(1)

  function map(src) { 
    return src + '// this is actually included in the sourcemap'; 
  }

  var bundle = '';
  browserify({ debug: true })
    .require(require.resolve('../examples/project/js/main.js'), { entry: true })
    .bundle()
    .on('error', function (err) { console.error(err); })

    .pipe(mold.transformSourcesContent(map))
    .on('data', function (data) {
      bundle += data;    
    })
    .on('end', function () {
      var sm = convert.fromSource(bundle);
      t.ok(~sm.getProperty('sourcesContent')[0].indexOf('// this is actually included in the sourcemap')
         ,'molds all sources contents viat the map function')
    });
});
