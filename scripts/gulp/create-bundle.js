/**
 * Shared functions for creating JS code bundles using Browserify.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const babelify = require('babelify');
const browserify = require('browserify');
const coffeeify = require('coffeeify');
const exorcist = require('exorcist');
const envify = require('loose-envify/custom');
const gulpUtil = require('gulp-util');
const mkdirp = require('mkdirp');
const through = require('through2');
const uglifyify = require('uglifyify');
const watchify = require('watchify');

const log = gulpUtil.log;

function streamFinished(stream) {
  return new Promise(function(resolve, reject) {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function waitForever() {
  return new Promise(function() {});
}

/**
 * Create a transform stream which wraps code from the input with a function
 * which is immediately executed (aka. an "IIFE").
 *
 * @param {string} headerCode - Code added at the start of the wrapper function.
 * @param {string} trailerCode - Code added at the end of the wrapper function.
 * @return {Transform} - A Node `Transform` stream.
 */
function wrapCodeWithFunction(headerCode, trailerCode = '') {
  const iifeStart = '(function() {' + headerCode + ';';
  const iifeEnd = ';' + trailerCode + '})()';

  let isFirstChunk = true;
  return through(
    function(data, enc, callback) {
      if (isFirstChunk) {
        isFirstChunk = false;
        this.push(Buffer.from(iifeStart));
      }
      this.push(data);
      callback();
    },
    function(callback) {
      this.push(Buffer.from(iifeEnd));
      callback();
    }
  );
}

/**
 * Wrap a Browserify bundle's code to change the name of the `require` function
 * which the bundle uses to load modules defined in other bundles.
 *
 * Use this together with Browserify's `externalRequireName` option to define/use
 * a different name for the `require` function. This is useful to avoid conflicts
 * with other code on the page which define/use "require".
 *
 * @param {string} name - Replacement name for the `require` function.
 * @return {Transform} - A node `Transform` stream.
 */
function useExternalRequireName(name) {
  // Make the `require` lookup inside the bundle find `name` in the global
  // scope exported by a previous bundle, instead of `require`.
  return wrapCodeWithFunction(
    `var require=("function"==typeof ${name}&&${name})`
  );
}

/**
 * type Transform = 'coffee';
 *
 * interface BundleOptions {
 *   name: string;
 *   path: string;
 *
 *   entry?: string[];
 *   require?: string[];
 *   transforms: Transform[];
 *
 *   minify?: boolean;
 * }
 *
 * interface BuildOptions {
 *   watch?: boolean;
 * }
 */

/**
 * Generates a JavaScript application or library bundle and source maps
 * for debugging.
 *
 * @param {BundleOptions} config - Configuration information for this bundle,
 *                                 specifying the name of the bundle, what
 *                                 modules to include and which code
 *                                 transformations to apply.
 * @param {BuildOptions} buildOpts
 * @return {Promise} Promise for when the bundle is fully written
 *                   if opts.watch is false or a promise that
 *                   waits forever otherwise.
 */
module.exports = function createBundle(config, buildOpts) {
  mkdirp.sync(config.path);

  buildOpts = buildOpts || { watch: false };

  // Use a custom name for the "require" function that bundles use to export
  // and import modules from other bundles. This avoids conflicts with eg.
  // pages that use RequireJS.
  const externalRequireName = 'hypothesisRequire';

  const bundleOpts = {
    debug: true,
    extensions: ['.coffee'],

    // Browserify will try to detect and automatically provide
    // browser implementations of Node modules.
    //
    // This can bloat the bundle hugely if implementations for large
    // modules like 'Buffer' or 'crypto' are inadvertently pulled in.
    // Here we explicitly whitelist the builtins that can be used.
    //
    // In particular 'Buffer' is excluded from the list of automatically
    // detected variables.
    //
    // See node_modules/browserify/lib/builtins.js to find out which
    // modules provide the implementations of these.
    builtins: ['console', '_process', 'querystring'],
    externalRequireName,
    insertGlobalVars: {
      // The Browserify polyfill for the `Buffer` global is large and
      // unnecessary, but can get pulled into the bundle by modules that can
      // optionally use it if present.
      Buffer: undefined,
      // Override the default stub for the `global` var which defaults to
      // the `global`, `self` and `window` globals in that order.
      //
      // This can break on web pages which provide their own definition of
      // `global` or `self` that is not an alias for `window`. See
      // https://github.com/hypothesis/h/issues/2723 and
      // https://github.com/hypothesis/client/issues/277
      global: function() {
        return 'window';
      },
    },
  };

  if (buildOpts.watch) {
    bundleOpts.cache = {};
    bundleOpts.packageCache = {};
  }

  // Specify modules that Browserify should not parse.
  // The 'noParse' array must contain full file paths,
  // not module names.
  bundleOpts.noParse = (config.noParse || []).map(function(id) {
    // If package.json specifies a custom entry point for the module for
    // use in the browser, resolve that.
    const packageConfig = require('../../package.json');
    if (packageConfig.browser && packageConfig.browser[id]) {
      return require.resolve('../../' + packageConfig.browser[id]);
    } else {
      return require.resolve(id);
    }
  });

  const name = config.name;

  const bundleFileName = name + '.bundle.js';
  const bundlePath = config.path + '/' + bundleFileName;
  const sourcemapPath = bundlePath + '.map';

  const bundle = browserify([], bundleOpts);

  (config.require || []).forEach(function(req) {
    // When another bundle uses 'bundle.external(<module path>)',
    // the module path is rewritten relative to the
    // base directory and a '/' prefix is added, so
    // if the other bundle contains "require('./dir/module')",
    // then Browserify will generate "require('/dir/module')".
    //
    // In the bundle which provides './dir/module', we
    // therefore need to expose the module as '/dir/module'.
    if (req[0] === '.') {
      bundle.require(req, { expose: req.slice(1) });
    } else if (req[0] === '/') {
      // If the require path is absolute, the same rules as
      // above apply but the path needs to be relative to
      // the root of the repository
      const repoRootPath = path.join(__dirname, '../../');
      const relativePath = path.relative(
        path.resolve(repoRootPath),
        path.resolve(req)
      );
      bundle.require(req, { expose: '/' + relativePath });
    } else {
      // this is a package under node_modules/, no
      // rewriting required.
      bundle.require(req);
    }
  });

  bundle.add(config.entry || []);
  bundle.external(config.external || []);

  (config.transforms || []).forEach(function(transform) {
    if (transform === 'coffee') {
      bundle.transform(coffeeify);
    }
    if (transform === 'babel') {
      bundle.transform(babelify);
    }
  });

  if (config.minify) {
    bundle.transform({ global: true }, uglifyify);
  }

  // Include or disable debugging checks in our code and dependencies by
  // replacing references to `process.env.NODE_ENV`.
  bundle.transform(
    envify({
      NODE_ENV: process.env.NODE_ENV || 'development',
    }),
    {
      // Ideally packages should configure this transform in their package.json
      // file if they need it, but not all of them do.
      global: true,
    }
  );

  function build() {
    const output = fs.createWriteStream(bundlePath);
    const b = bundle.bundle();
    b.on('error', function(err) {
      log('Build error', err.toString());
    });
    const stream = b
      .pipe(useExternalRequireName(externalRequireName))
      .pipe(exorcist(sourcemapPath))
      .pipe(output);
    return streamFinished(stream);
  }

  if (buildOpts.watch) {
    bundle.plugin(watchify);
    bundle.on('update', function(ids) {
      const start = Date.now();

      log('Source files changed', ids);
      build()
        .then(function() {
          log('Updated %s (%d ms)', bundleFileName, Date.now() - start);
        })
        .catch(function(err) {
          console.error('Building updated bundle failed:', err);
        });
    });
    build()
      .then(function() {
        log('Built ' + bundleFileName);
      })
      .catch(function(err) {
        console.error('Error building bundle:', err);
      });

    return waitForever();
  } else {
    return build();
  }
};
