'use strict';

var convert = require('convert-source-map')
  , inherits = require('util').inherits
  , through = require('through')
  , path = require('path');

function extractComment (source) {
  var m = source.match(convert.commentRegex);
  return m ? m.pop() : null;
} 

function Molder(sourcemap) {
  this.sourcemap = sourcemap;
}

Molder.prototype.toJSON    =  function (space) { return this.sourcemap.toJSON(space); };
Molder.prototype.toBase64  =  function () { return this.sourcemap.toBase64(); };
Molder.prototype.toComment =  function () { return this.sourcemap.toComment(); };
Molder.prototype.toObject  =  function () { return this.sourcemap.toObject(); };

Molder.prototype._map = function (key, fn) {
  this.sourcemap.setProperty(key, this.sourcemap.getProperty(key).map(fn));
};

Molder.prototype.mapSources = function (fn) {
  this._map('sources', fn);
};

Molder.prototype.mapSourcesContent = function (fn) {
  this._map('sourcesContent', fn);
};

Molder.prototype.file = function (file) {
  this.sourcemap.setProperty('file', file);
};

Molder.prototype.sourceRoot = function (sourceRoot) {
  this.sourcemap.setProperty('sourceRoot', sourceRoot);
};

function SourceMolder(source) {
  this.source = source;
  this.comment = extractComment(source);
  if (!this.comment) return undefined;

  var sm = convert.fromComment(this.comment);
  Molder.call(this, sm);
}

inherits(SourceMolder, Molder);

SourceMolder.prototype.replaceComment = function () {
  var moldedComment = this.sourcemap.toComment();
  return this.source.replace(this.comment, moldedComment);
};

function mapToTransform(fnKey, mapFn) {
  var source = '';

  function write (data) { source += data; }
  function end () { 
    var sourceMolder = fromSource(source);
    sourceMolder[fnKey](mapFn);
    this.queue(sourceMolder.replaceComment());
    this.queue(null);
  }

  return through(write, end);
}

var fromSource = exports.fromSource = function (source) {
  return new SourceMolder(source);
};

function mapPathRelativeTo (root) {
  return function map(file) {
    return path.relative(root, file);
  };
}

exports.mapPathRelativeTo = mapPathRelativeTo;

exports.transform = function (fn) {
  var source = '';

  function write (data) { source += data; }
  function end () { 
    var sourceMolder = fromSource(source);

    function queue(adaptedComment) {
      this.queue(source.replace(sourceMolder.comment, adaptedComment));
      this.queue(null);
    }

    if (fn.length === 1) {
      var adaptedComment = fn(sourceMolder);
      queue.bind(this)(adaptedComment);
    } else if (fn.length > 1) {
      fn(sourceMolder, queue.bind(this));
    } else {
      throw new Error('Function passed to transform needs to take 1 or 2 parameters.');
    }
  }   

  return through(write, end);
};

exports.transformSourcesContent = function (map) {
  return mapToTransform('mapSourcesContent', map);
};

exports.transformSources = function (map) {
  return mapToTransform('mapSources', map);
};

/**
 * Adjusts all sources paths inside the source map contained in the content that is piped to it.
 *
 * Example: bundleStream.pipe(mold.sourcesRelative(root)).pipe(fs.createWriteStream(bundlePath))
 *
 * @name transformSourcesRelativeTo
 * @function
 * @param root {String} The path to make sources relative to.
 * @return {Stream} A duplex stream that writes out content with source map that had all sources paths adjusted.
 */
exports.transformSourcesRelativeTo = function (root) {
  return exports.transformSources(mapPathRelativeTo(root));
};

