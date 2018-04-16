'use strict';

var path       =  require('path')
  , fs         =  require('fs')
  , browserify =  require('browserify')
  , mold       =  require('..')
  , bundlePath =  path.join(__dirname, 'project', 'js', 'build', 'bundle.js')
  , jsRoot     =  path.join(__dirname, 'project');

function map(src) { 
  return src + '// don\'t edit, this exists only inside the source map' ;
}

browserify()
  .require(require.resolve('./project/js/main.js'), { entry: true })
  .bundle({ debug: true })
  .on('error', function (err) { console.error(err); })
  .pipe(mold.transformSourcesContent(map))
  .pipe(fs.createWriteStream(bundlePath));

console.log('Please open the index.html inside examples/project.');
