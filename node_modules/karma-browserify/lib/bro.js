'use strict';

var browserify = require('browserify'),
    watchify;

try {
  watchify = require('watchify');
} catch (e) {
  // watchify is an optional dependency

  // we will fail as soon as a user tires to use autoWatch without
  // watchify installed.
}


var convert = require('convert-source-map'),
    minimatch = require('minimatch'),
    escape = require('js-string-escape');

var path = require('path'),
    fs = require('fs');

var reduce = require('lodash/collection/reduce'),
    find = require('lodash/collection/find'),
    any = require('lodash/collection/any'),
    forEach = require('lodash/collection/forEach'),
    assign = require('lodash/object/assign'),
    omit = require('lodash/object/omit'),
    debounce = require('lodash/function/debounce');


var BundleFile = require('./bundle-file');


/**
 * The time to wait for additional file change nofifications
 * before performing a rebundling operation.
 *
 * This value must be chosen with care. The smaller it is, the
 * faster the rebundling + testing cycle is. At the same time
 * the chance increases karma-browserify performs bundling steps
 * twice because it triggers a rebundle before all file change
 * triggers have been transmitted.
 */
var DEFAULT_BUNDLE_DELAY = 700;

var BUNDLE_ERROR_TPL = 'throw new Error("bundle error (see logs)");';


/**
 * Extract the source map from the given bundle contents
 *
 * @param {String} source
 * @return {SourceMap} if it could be parsed
 */
function extractSourceMap(bundleContents) {
  var start = bundleContents.lastIndexOf('//# sourceMappingURL');
  var sourceMapComment = start !== -1 ? bundleContents.substring(start) : '';

  return sourceMapComment && convert.fromComment(sourceMapComment);
}

/**
 * Creates an instance of karma-browserify that provides the
 * neccessary framework and preprocessors.
 *
 * @param {BundleFile} [bundleFile]
 */
function Bro(bundleFile) {

  var log;

  /**
   * Add bundle file to the list of files in the
   * configuration, right before the first browserified
   * test file and after everything else.
   *
   * That makes sure users can include non-commonJS files
   * prior to the browserified bundle.
   *
   * @param {BundleFile} bundleFile the file containing the browserify bundle
   * @param {Object} config the karma configuration to be updated
   */
  function addBundleFile(bundleFile, config) {

    var files = config.files,
        preprocessors = config.preprocessors;

    // list of patterns using our preprocessor
    var patterns = reduce(preprocessors, function(matched, val, key) {
      if (val.indexOf('browserify') !== -1) {
        matched.push(key);
      }
      return matched;
    }, []);

    // first file being preprocessed
    var file = find(files, function(f) {
      return any(patterns, function(p) {
        return minimatch(f.pattern, p);
      });
    });

    var idx = 0;

    if (file) {
      idx = files.indexOf(file);
    } else {
      log.debug('no matching preprocessed file was found, defaulting to prepend');
    }

    log.debug('add bundle to config.files at position', idx);

    // insert bundle on the correct spot
    files.splice(idx, 0, {
      pattern: bundleFile.location,
      served: true,
      included: true,
      watched: true
    });
  }


  /**
   * The browserify instance that creates the
   * minified bundle and gets added all test files to it.
   */
  var b;


  /**
   * The browserify framework that creates the initial logger and bundle file
   * as well as prepends the bundle file to the karma file configuration.
   */
  function framework(emitter, config, logger) {

    log = logger.create('framework.browserify');

    if (!bundleFile) {
      bundleFile = new BundleFile();
    }

    bundleFile.touch();
    log.debug('created browserify bundle: %s', bundleFile.location);

    b = createBundle(config);

    // TODO(Nikku): hook into karma karmas file update facilities
    // to remove files from the bundle once karma detects the deletion

    // hook into exit for cleanup
    emitter.on('exit', function(done) {
      log.debug('cleaning up');

      if (b.close) {
        b.close();
      }

      bundleFile.remove();
      done();
    });


    // add bundle file to the list of files defined in the
    // configuration. be smart by doing so.
    addBundleFile(bundleFile, config);

    return b;
  }

  framework.$inject = [ 'emitter', 'config', 'logger' ];


  /**
   * Create the browserify bundle
   */
  function createBundle(config) {

    var bopts = config.browserify || {},
        bundleDelay = bopts.bundleDelay || DEFAULT_BUNDLE_DELAY,
        requireName = bopts.externalRequireName || 'require';

    function warn(key) {
      log.warn('Invalid config option: "' + key + 's" should be "' + key + '"');
    }

    forEach([ 'transform', 'plugin' ], function(key) {
      if (bopts[key + 's']) {
        warn(key);
      }
    });

    var browserifyOptions = assign({
      basedir: path.resolve(config.basePath),
      // watchify.args
      cache: {},
      packageCache: {}
    }, omit(bopts, [
      'transform', 'plugin', 'configure', 'bundleDelay'
    ]));

    if ('prebundle' in browserifyOptions) {
      log.warn('The prebundle hook got removed in favor of configure');
    }

    if ('watchify' in browserifyOptions) {
      log.warn('Configure watchify via config.watchify');
    }

    var w = browserify(browserifyOptions);
    w.setMaxListeners(Infinity);

    forEach(bopts.plugin, function(p) {
      // ensure we can pass plugin options as
      // the first parameter
      if (!Array.isArray(p)) {
        p = [ p ];
      }
      w.plugin.apply(w, p);
    });

    forEach(bopts.transform, function(t) {
      // ensure we can pass transform options as
      // the first parameter
      if (!Array.isArray(t)) {
        t = [ t ];
      }
      w.transform.apply(w, t);
    });

    // test if we have a configure function
    if (bopts.configure && typeof bopts.configure === 'function') {
      bopts.configure(w);
    }

    // register rebuild bundle on change
    if (config.autoWatch) {

      if (!watchify) {
        log.error('watchify not found; install it via npm install --save-dev watchify');
        log.error('cannot perform incremental rebuild');

        throw new Error('watchify not found');
      }

      w = watchify(w, config.watchify);

      log.info('registering rebuild (autoWatch=true)');

      w.on('update', function(updated) {

        // we perform an update, karma will trigger one, too
        // because the bundling is deferred only one change will
        // be triggered. Anything else is the result of a
        // raise condition or a problem of watchify firing file
        // changes to late

        log.debug('files changed');
        deferredBundle();
      });

      w.on('log', function(msg) {
        log.info(msg);
      });

      // update bundle file
      w.on('bundled', function(err, content) {
        if (w._builtOnce) {
          bundleFile.update(err ? BUNDLE_ERROR_TPL : content.toString('utf-8'));
          log.info('bundle updated');
        }
      });
    }

    function deferredBundle(cb) {
      if (cb) {
        w.once('bundled', cb);
      }

      rebuild();
    }

    var rebuild = debounce(function rebuild() {

      if (w._bundled) {
        log.debug('resetting bundle');

        var recorded = w._recorded;
        w.reset();

        recorded.forEach(function(e) {
          // we remove missing files on the fly
          // to cope with bundle internals missing
          if (e.file && !fs.existsSync(path.resolve(config.basePath, e.file))) {
            log.debug('removing missing file', e.file);
          } else {
            w.pipeline.write(e);
          }
        });
      }

      w.emit('prebundle', w);

      log.debug('bundling');

      w.bundle(function(err, content) {

        if (err) {
          log.error('bundle error');
          log.error(String(err));
        }

        w.emit('bundled', err, content);
      });
    }, bundleDelay);


    w.bundleFile = function(file, done) {

      var absolutePath = path.resolve(file.path),
          relativePath = path.relative(config.basePath, absolutePath);

      // add file
      log.debug('updating %s in bundle', relativePath);

      // add the file during next prebundle step
      w.once('prebundle', function() {
        w.require('./' + relativePath, { expose: absolutePath });
      });

      deferredBundle(function(err) {
        var stub = 'typeof ' + requireName + ' === "function" && ' + requireName + '("' + escape(absolutePath) + '");';

        done(err, stub);
      });
    };


    /**
     * Wait for the bundle creation to have stabilized (no more additions) and invoke a callback.
     *
     * @param {Function} [callback] invoked with (err, content)
     */
    w.deferredBundle = deferredBundle;

    return w;
  }


  /**
   * A processor that preprocesses commonjs test files which should be
   * delivered via browserify.
   */
  function testFilePreprocessor() {

    return function(content, file, done) {
      b.bundleFile(file, function(err, content) {
        done(content && content.toString());
      });
    };
  }

  testFilePreprocessor.$inject = [ ];


  /**
   * A special preprocessor that builds the main browserify bundle once and
   * passes the bundle contents through on all later preprocessing request.
   */
  function bundlePreprocessor(config) {

    var debug = config.browserify && config.browserify.debug;

    function updateSourceMap(file, content) {
      var map;

      if (debug) {

        map = extractSourceMap(content);

        file.sourceMap = map && map.sourcemap;
      }
    }

    return function(content, file, done) {

      if (b._builtOnce) {
        updateSourceMap(file, content);
        return done(content);
      }

      log.debug('building bundle');

      // wait for the initial bundle to be created
      b.deferredBundle(function(err, content) {

        b._builtOnce = config.autoWatch;

        if (err) {
          return done(BUNDLE_ERROR_TPL);
        }

        content = content.toString('utf-8');
        updateSourceMap(file, content);

        log.info('bundle built');

        done(content);
      });
    };
  }

  bundlePreprocessor.$inject = [ 'config' ];


  // API

  this.framework = framework;

  this.testFilePreprocessor = testFilePreprocessor;
  this.bundlePreprocessor = bundlePreprocessor;
}

Bro.$inject = [];

module.exports = Bro;
