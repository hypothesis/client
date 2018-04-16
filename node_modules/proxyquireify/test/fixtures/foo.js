var stats = require('./stats')
  , bar = require('./bar')
  , path = require('path')
  ;

window.foostats.incFooRequires();

function bigBar () { 
  // inline require not working in proxquireify (unlike in original proxyquire)
  return bar.bar().toUpperCase();
}

function bigRab () {
  // module wide require
  return bar.rab().toUpperCase();
}

function bigExt (file) {
  return path.extname(file).toUpperCase();
}

function bigBas (file) {
  return path.basename(file).toUpperCase();
}

module.exports = {
    bigBar: bigBar
  , bigRab: bigRab
  , bigExt: bigExt
  , bigBas: bigBas
};
