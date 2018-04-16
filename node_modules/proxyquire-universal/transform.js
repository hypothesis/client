'use strict'

var through = require('through2')
var transformify = require('transformify')
var replaceRequires = require('replace-requires')

module.exports = function (file, options) {
  if (/\.json$/.test(file)) return through()
  return transformify(replaceProxyquire)()
}

var replacement = 'require(\'proxyquireify\')(require)'
function replaceProxyquire (code) {
  return replaceRequires(code, {proxyquire: replacement})
}
