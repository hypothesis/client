'use strict';

var test  = require('tap').test
  , child = require('child_process')
  , path  = require('path')

test('compatible with watchify cli', function (t) {
  t.plan(1)

  var watchify = path.resolve(__dirname, '../node_modules/.bin/watchify')
  var plugin = path.resolve(__dirname, '../plugin')

  var options = {cwd: __dirname}
  var cp = child.execFile(watchify, ['fixtures/bar.js', '-v', '-p', plugin, '-o', '/dev/null'], options, onEnd)
  cp.stderr.on('data', cp.kill.bind(cp, 'SIGTERM'))

  function onEnd (err, stdout, stderr) {
    t.equal(err.signal, 'SIGTERM', 'no errors from watchify')
  }
})
