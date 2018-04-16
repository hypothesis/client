var fs         = require('fs')
  , proxyquire = require('proxyquireify')
  , browserify = require('browserify')
  ;

browserify({ debug: true })
  .plugin(proxyquire.plugin)
  .require(require.resolve('./test'), { entry: true })
  .bundle()
  .pipe(fs.createWriteStream(__dirname + '/bundle.js'));
