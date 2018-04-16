'use strict'

var printf = require('pff')

module.exports = function requireDeps (deps) {
  if (!Array.isArray(deps)) deps = [deps]
  return deps.reduce(function (string, dep) {
    return string + printf('require(\'%s\');', dep)
  }, '')
}
