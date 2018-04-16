'use strict';

var browserify = require('browserify')
  , path       = require('path')
  , fs         = require('fs')
  , exorcist   = require('../')
  , mapfile    = path.join(__dirname, 'bundle.js.map')

browserify()
  .require(require.resolve('./main'), { entry: true })
  .bundle({ debug: true })
  .on('end', function () {
    console.log('all done, open index.html')
  })
  .pipe(exorcist(mapfile))
  .pipe(fs.createWriteStream(path.join(__dirname, 'bundle.js'), 'utf8'))
