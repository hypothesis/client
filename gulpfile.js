/* eslint-env node */

'use strict';

var path = require('path');

var batch = require('gulp-batch');
var changed = require('gulp-changed');
var commander = require('commander');
var debounce = require('lodash.debounce');
var endOfStream = require('end-of-stream');
var gulp = require('gulp');
var gulpIf = require('gulp-if');
var gulpUtil = require('gulp-util');
var postcss = require('gulp-postcss');
var postcssURL = require('postcss-url');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var through = require('through2');

var createBundle = require('./scripts/gulp/create-bundle');
var manifest = require('./scripts/gulp/manifest');
var servePackage = require('./scripts/gulp/serve-package');
var vendorBundles = require('./scripts/gulp/vendor-bundles');

var IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';
var SCRIPT_DIR = 'build/scripts';
var STYLE_DIR = 'build/styles';
var FONTS_DIR = 'build/fonts';
var IMAGES_DIR = 'build/images';
var TEMPLATES_DIR = 'src/sidebar/templates';

// LiveReloadServer instance for sending messages to connected
// development clients
var liveReloadServer;
// List of file paths that changed since the last live-reload
// notification was dispatched
var liveReloadChangedFiles = [];

function parseCommandLine() {
  commander
    // Test configuration.
    // See https://github.com/karma-runner/karma-mocha#configuration
    .option('--grep [pattern]', 'Run only tests matching a given pattern')
    .parse(process.argv);

  if (commander.grep) {
    gulpUtil.log(`Running tests matching pattern /${commander.grep}/`);
  }

  return {
    grep: commander.grep,
  };
}

var taskArgs = parseCommandLine();

function isSASSFile(file) {
  return file.path.match(/\.scss$/);
}

function getEnv(key) {
  if (!process.env.hasOwnProperty(key)) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return process.env[key];
}

/** A list of all modules included in vendor bundles. */
var vendorModules = Object.keys(vendorBundles.bundles)
  .reduce(function (deps, key) {
    return deps.concat(vendorBundles.bundles[key]);
  }, []);

// Builds the bundles containing vendor JS code
gulp.task('build-vendor-js', function () {
  var finished = [];
  Object.keys(vendorBundles.bundles).forEach(function (name) {
    finished.push(createBundle({
      name: name,
      require: vendorBundles.bundles[name],
      minify: IS_PRODUCTION_BUILD,
      path: SCRIPT_DIR,
      noParse: vendorBundles.noParseModules,
    }));
  });
  return Promise.all(finished);
});

var appBundleBaseConfig = {
  path: SCRIPT_DIR,
  external: vendorModules,
  minify: IS_PRODUCTION_BUILD,
  noParse: vendorBundles.noParseModules,
};

var appBundles = [{
  // The entry point for both the Hypothesis client and the sidebar
  // application. This is responsible for loading the rest of the assets needed
  // by the client.
  name: 'boot',
  entry: './src/boot/index',
  transforms: ['babel'],
},{
  // The sidebar application for displaying and editing annotations.
  name: 'app',
  transforms: ['babel', 'coffee'],
  entry: './src/sidebar/app',
},{
  // The annotation layer which handles displaying highlights, presenting
  // annotation tools on the page and instantiating the sidebar application.
  name: 'injector',
  entry: './src/annotator/main',
  transforms: ['babel', 'coffee'],
}];

var appBundleConfigs = appBundles.map(function (config) {
  return Object.assign({}, appBundleBaseConfig, config);
});

gulp.task('build-js', ['build-vendor-js'], function () {
  return Promise.all(appBundleConfigs.map(function (config) {
    return createBundle(config);
  }));
});

gulp.task('watch-js', ['build-vendor-js'], function () {
  appBundleConfigs.forEach(function (config) {
    createBundle(config, {watch: true});
  });
});

var styleFiles = [
  // H
  './src/styles/annotator/inject.scss',
  './src/styles/annotator/pdfjs-overrides.scss',
  './src/styles/app.scss',

  // Vendor
  './src/styles/vendor/angular-csp.css',
  './src/styles/vendor/icomoon.css',
  './node_modules/katex/dist/katex.min.css',
  './node_modules/angular-toastr/dist/angular-toastr.css',
];

gulp.task('build-css', function () {
  // Rewrite font URLs to look for fonts in 'build/fonts' instead of
  // 'build/styles/fonts'
  function rewriteCSSURL(url) {
    return url.replace(/^fonts\//, '../fonts/');
  }

  var sassOpts = {
    outputStyle: IS_PRODUCTION_BUILD ? 'compressed' : 'nested',
  };

  var cssURLRewriter = postcssURL({
    url: rewriteCSSURL,
  });

  return gulp.src(styleFiles)
    .pipe(sourcemaps.init())
    .pipe(gulpIf(isSASSFile, sass(sassOpts).on('error', sass.logError)))
    .pipe(postcss([require('autoprefixer'), cssURLRewriter]))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(STYLE_DIR));
});

gulp.task('watch-css', ['build-css'], function () {
  var vendorCSS = styleFiles.filter(function (path) {
    return path.endsWith('.css');
  });
  var styleFileGlobs = vendorCSS.concat('./src/styles/**/*.scss');

  gulp.watch(styleFileGlobs, ['build-css']);
});

var fontFiles = ['src/styles/vendor/fonts/*.woff',
                 'node_modules/katex/dist/fonts/*.woff',
                 'node_modules/katex/dist/fonts/*.woff2'];

gulp.task('build-fonts', function () {
  gulp.src(fontFiles)
    .pipe(changed(FONTS_DIR))
    .pipe(gulp.dest(FONTS_DIR));
});

gulp.task('watch-fonts', ['build-fonts'], function () {
  gulp.watch(fontFiles, ['build-fonts']);
});

var imageFiles = 'src/images/**/*';
gulp.task('build-images', function () {
  gulp.src(imageFiles)
    .pipe(changed(IMAGES_DIR))
    .pipe(gulp.dest(IMAGES_DIR));
});

gulp.task('watch-images', ['build-images'], function () {
  gulp.watch(imageFiles, ['build-images']);
});

gulp.task('watch-templates', function () {
  gulp.watch(TEMPLATES_DIR + '/*.html', function (file) {
    liveReloadServer.notifyChanged([file.path]);
  });
});

var MANIFEST_SOURCE_FILES = 'build/@(fonts|images|scripts|styles)/*.@(js|css|woff|jpg|png|svg)';

var prevManifest = {};

/**
 * Return an array of asset paths that changed between
 * two versions of a manifest.
 */
function changedAssets(prevManifest, newManifest) {
  return Object.keys(newManifest).filter(function (asset) {
    return newManifest[asset] !== prevManifest[asset];
  });
}

var debouncedLiveReload = debounce(function () {
  // Notify dev clients about the changed assets. Note: This currently has an
  // issue that if CSS, JS and templates are all changed in quick succession,
  // some of the assets might be empty/incomplete files that are still being
  // generated when this is invoked, causing the reload to fail.
  //
  // Live reload notifications are debounced to reduce the likelihood of this
  // happening.
  liveReloadServer.notifyChanged(liveReloadChangedFiles);
  liveReloadChangedFiles = [];
}, 250);

function triggerLiveReload(changedFiles) {
  if (!liveReloadServer) {
    return;
  }
  liveReloadChangedFiles = liveReloadChangedFiles.concat(changedFiles);
  debouncedLiveReload();
}

/**
 * Return the hostname that should be used when generating URLs to the package
 * content server.
 *
 * Customizing this can be useful when testing the client on different devices
 * than the one the package content server is running on.
 */
function packageServerHostname() {
  return process.env.PACKAGE_SERVER_HOSTNAME || 'localhost';
}

var isFirstBuild = true;

/**
 * Generates the `build/boot.js` script which serves as the entry point for
 * the Hypothesis client.
 *
 * @param {Object} manifest - Manifest mapping asset paths to cache-busted URLs
 */
function generateBootScript(manifest) {
  var { version } = require('./package.json');

  var defaultSidebarAppUrl = process.env.SIDEBAR_APP_URL ?
    `${process.env.SIDEBAR_APP_URL}` : 'https://hypothes.is/app.html';

  var defaultAssetRoot;

  if (process.env.NODE_ENV === 'production') {
    defaultAssetRoot = `https://cdn.hypothes.is/hypothesis/${version}/`;
  } else {
    defaultAssetRoot = `http://${packageServerHostname()}:3001/hypothesis/${version}/`;
  }

  if (isFirstBuild) {
    gulpUtil.log(`Sidebar app URL: ${defaultSidebarAppUrl}`);
    gulpUtil.log(`Client asset root URL: ${defaultAssetRoot}`);
    isFirstBuild = false;
  }

  gulp.src('build/scripts/boot.bundle.js')
    .pipe(replace('__MANIFEST__', JSON.stringify(manifest)))
    .pipe(replace('__ASSET_ROOT__', defaultAssetRoot))
    .pipe(replace('__SIDEBAR_APP_URL__', defaultSidebarAppUrl))
    // Strip sourcemap link. It will have been invalidated by the previous
    // replacements and the bundle is so small that it isn't really valuable.
    .pipe(replace(/^\/\/# sourceMappingURL=[^ ]+$/m,''))
    .pipe(rename('boot.js'))
    .pipe(gulp.dest('build/'));
}

/**
 * Generate a JSON manifest mapping file paths to
 * URLs containing cache-busting query string parameters.
 */
function generateManifest() {
  gulp.src(MANIFEST_SOURCE_FILES)
    .pipe(manifest({name: 'manifest.json'}))
    .pipe(through.obj(function (file, enc, callback) {
      // Trigger a reload of the client in the dev server at localhost:3000
      var newManifest = JSON.parse(file.contents.toString());
      var changed = changedAssets(prevManifest, newManifest);
      prevManifest = newManifest;
      triggerLiveReload(changed);

      // Expand template vars in boot script bundle
      generateBootScript(newManifest);

      this.push(file);
      callback();
    }))
    .pipe(gulp.dest('build/'));
}

gulp.task('watch-manifest', function () {
  gulp.watch(MANIFEST_SOURCE_FILES, batch(function (events, done) {
    endOfStream(generateManifest(), function () {
      done();
    });
  }));
});

gulp.task('serve-live-reload', ['serve-package'], function () {
  var LiveReloadServer = require('./scripts/gulp/live-reload-server');
  liveReloadServer = new LiveReloadServer(3000, {
    clientUrl: `http://${packageServerHostname()}:3001/hypothesis`,
  });
});

gulp.task('serve-package', function () {
  servePackage(3001, packageServerHostname());
});

gulp.task('build', ['build-js',
                    'build-css',
                    'build-fonts',
                    'build-images'],
          generateManifest);

gulp.task('watch', ['serve-package',
                    'serve-live-reload',
                    'watch-js',
                    'watch-css',
                    'watch-fonts',
                    'watch-images',
                    'watch-manifest',
                    'watch-templates']);

function runKarma(baseConfig, opts, done) {
  // See https://github.com/karma-runner/karma-mocha#configuration
  var cliOpts = {
    client: {
      mocha: {
        grep: taskArgs.grep,
      },
    },
  };

  // Work around a bug in Karma 1.10 which causes console log messages not to
  // be displayed when using a non-default reporter.
  // See https://github.com/karma-runner/karma/pull/2220
  var BaseReporter = require('karma/lib/reporters/base');
  BaseReporter.decoratorFactory.$inject =
    BaseReporter.decoratorFactory.$inject.map(dep =>
        dep.replace('browserLogOptions', 'browserConsoleLogOptions'));

  var karma = require('karma');
  new karma.Server(Object.assign({}, {
    configFile: path.resolve(__dirname, baseConfig),
  }, cliOpts, opts), done).start();
}

gulp.task('test', function (callback) {
  runKarma('./src/karma.config.js', {singleRun:true}, callback);
});

gulp.task('test-watch', function (callback) {
  runKarma('./src/karma.config.js', {}, callback);
});

gulp.task('upload-sourcemaps', ['build-js'], function () {
  var uploadToSentry = require('./scripts/gulp/upload-to-sentry');

  var opts = {
    key: getEnv('SENTRY_API_KEY'),
    organization: getEnv('SENTRY_ORGANIZATION'),
  };
  var projects = getEnv('SENTRY_PROJECTS').split(',');
  var release = getEnv('SENTRY_RELEASE_VERSION');

  return gulp.src(['build/scripts/*.js', 'build/scripts/*.map'])
    .pipe(uploadToSentry(opts, projects, release));
});
