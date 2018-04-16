'use strict';

var path        =  require('path')
  , fs          =  require('fs')
  , browserify  =  require('browserify')
  , mold        =  require('..')
  , bundlePath  =  path.join(__dirname, 'project', 'js', 'build', 'bundle.js')
    // putting map file right next to bundle file
  , mapFilePath =  bundlePath +  '.map'
  , jsRoot      =  path.join(__dirname, 'project');

function mapFileUrlComment(sourcemap, cb) {
  
  // make source files appear under the following paths:
  // /js
  //    foo.js
  //    main.js
  // /js/wunder
  //    bar.js 
  
  sourcemap.sourceRoot('file://'); 
  sourcemap.mapSources(mold.mapPathRelativeTo(jsRoot));

  // write map file and return a sourceMappingUrl that points to it
  fs.writeFile(mapFilePath, sourcemap.toJSON(2), 'utf-8', function (err) {
    if (err) return console.error(err);
    // Giving just a filename instead of a path will cause the browser to look for the map file 
    // right next to where it loaded the bundle from.
    // Therefore this way the map is found no matter if the page is served or opened from the filesystem.
    cb('//@ sourceMappingURL=' + path.basename(mapFilePath));
  });
}

browserify()
  .require(require.resolve('./project/js/main.js'), { entry: true })
  .bundle({ debug: true })
  .on('error', function (err) { console.error(err); })
  .pipe(mold.transform(mapFileUrlComment))
  .pipe(fs.createWriteStream(bundlePath));

console.log('Please open the index.html inside examples/project.');
console.log('An external map file was generated at: ', path.relative(process.cwd(), mapFilePath));
