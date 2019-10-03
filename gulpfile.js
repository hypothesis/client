/* eslint-env node */

'use strict';

const path = require('path');

const changed = require('gulp-changed');
const commander = require('commander');
const debounce = require('lodash.debounce');
const gulp = require('gulp');
const gulpIf = require('gulp-if');
const gulpUtil = require('gulp-util');
const postcss = require('gulp-postcss');
const postcssURL = require('postcss-url');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const through = require('through2');

const createBundle = require('./scripts/gulp/create-bundle');
const manifest = require('./scripts/gulp/manifest');
const servePackage = require('./scripts/gulp/serve-package');
const vendorBundles = require('./scripts/gulp/vendor-bundles');
const { useSsl } = require('./scripts/gulp/create-server');

const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';
const SCRIPT_DIR = 'build/scripts';
const STYLE_DIR = 'build/styles';
const FONTS_DIR = 'build/fonts';
const IMAGES_DIR = 'build/images';
const TEMPLATES_DIR = 'src/sidebar/templates';

// LiveReloadServer instance for sending messages to connected
// development clients
let liveReloadServer;
// List of file paths that changed since the last live-reload
// notification was dispatched
let liveReloadChangedFiles = [];

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

const taskArgs = parseCommandLine();

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
const vendorModules = Object.keys(vendorBundles.bundles).reduce(function(
  deps,
  key
) {
  return deps.concat(vendorBundles.bundles[key]);
},
[]);

// Builds the bundles containing vendor JS code
gulp.task('build-vendor-js', function() {
  const finished = [];
  Object.keys(vendorBundles.bundles).forEach(function(name) {
    finished.push(
      createBundle({
        name: name,
        require: vendorBundles.bundles[name],
        minify: IS_PRODUCTION_BUILD,
        path: SCRIPT_DIR,
        noParse: vendorBundles.noParseModules,
      })
    );
  });
  return Promise.all(finished);
});

const appBundleBaseConfig = {
  path: SCRIPT_DIR,
  external: vendorModules,
  minify: IS_PRODUCTION_BUILD,
  noParse: vendorBundles.noParseModules,
};

const appBundles = [
  {
    // The entry point for both the Hypothesis client and the sidebar
    // application. This is responsible for loading the rest of the assets needed
    // by the client.
    name: 'boot',
    entry: './src/boot/index',
    transforms: ['babel'],
  },
  {
    // The sidebar application for displaying and editing annotations.
    name: 'sidebar',
    transforms: ['babel'],
    entry: './src/sidebar/index',
  },
  {
    // The annotation layer which handles displaying highlights, presenting
    // annotation tools on the page and instantiating the sidebar application.
    name: 'annotator',
    entry: './src/annotator/index',
    transforms: ['babel', 'coffee'],
  },
];

// Polyfill bundles. Polyfills are grouped into "sets" (one bundle per set)
// based on major ECMAScript version or DOM API. Some large polyfills
// (eg. for String.prototype.normalize) are additionally separated out into
// their own bundles.
//
// To add a new polyfill:
//  - Add the relevant dependencies to the project
//  - Create an entry point in `src/shared/polyfills/{set}` and a feature
//    detection function in `src/shared/polyfills/index.js`
//  - Add an entry to the list below to generate the polyfill bundle
//  - Add the polyfill set name to the required dependencies for the parts of
//    the client that need it in `src/boot/boot.js`
//  - Add the polyfill to the test environment if necessary in `src/karma.config.js`
const polyfillBundles = [
  'document.evaluate',
  'es2015',
  'es2016',
  'es2017',
  'fetch',
  'string.prototype.normalize',
  'url',
].map(set => ({
  name: `polyfills-${set}`,
  entry: `./src/shared/polyfills/${set}`,
  transforms: ['babel'],
}));

const appBundleConfigs = appBundles.concat(polyfillBundles).map(config => {
  return Object.assign({}, appBundleBaseConfig, config);
});

gulp.task(
  'build-js',
  gulp.parallel('build-vendor-js', function() {
    return Promise.all(
      appBundleConfigs.map(function(config) {
        return createBundle(config);
      })
    );
  })
);

gulp.task(
  'watch-js',
  gulp.series('build-vendor-js', function watchJS() {
    appBundleConfigs.forEach(function(config) {
      createBundle(config, { watch: true });
    });
  })
);

const styleFiles = [
  // H
  './src/styles/annotator/annotator.scss',
  './src/styles/annotator/pdfjs-overrides.scss',
  './src/styles/sidebar/sidebar.scss',

  // Vendor
  './src/styles/vendor/angular-csp.css',
  './src/styles/vendor/icomoon.css',
  './node_modules/katex/dist/katex.min.css',
  './node_modules/angular-toastr/dist/angular-toastr.css',
];

gulp.task('build-css', function() {
  // Rewrite font URLs to look for fonts in 'build/fonts' instead of
  // 'build/styles/fonts'
  function rewriteCSSURL(asset) {
    return asset.url.replace(/^fonts\//, '../fonts/');
  }

  const sassOpts = {
    outputStyle: IS_PRODUCTION_BUILD ? 'compressed' : 'nested',
  };

  const cssURLRewriter = postcssURL({
    url: rewriteCSSURL,
  });

  return gulp
    .src(styleFiles)
    .pipe(sourcemaps.init())
    .pipe(gulpIf(isSASSFile, sass(sassOpts).on('error', sass.logError)))
    .pipe(postcss([require('autoprefixer'), cssURLRewriter]))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(STYLE_DIR));
});

gulp.task(
  'watch-css',
  gulp.series('build-css', function watchCSS() {
    const vendorCSS = styleFiles.filter(function(path) {
      return path.endsWith('.css');
    });
    const styleFileGlobs = vendorCSS.concat('./src/styles/**/*.scss');

    gulp.watch(styleFileGlobs, gulp.task('build-css'));
  })
);

const fontFiles = [
  'src/styles/vendor/fonts/*.woff',
  'node_modules/katex/dist/fonts/*.woff',
  'node_modules/katex/dist/fonts/*.woff2',
];

gulp.task('build-fonts', function() {
  return gulp
    .src(fontFiles)
    .pipe(changed(FONTS_DIR))
    .pipe(gulp.dest(FONTS_DIR));
});

gulp.task(
  'watch-fonts',
  gulp.series('build-fonts', function watchFonts() {
    gulp.watch(fontFiles, gulp.task('build-fonts'));
  })
);

const imageFiles = 'src/images/**/*';
gulp.task('build-images', function() {
  return gulp
    .src(imageFiles)
    .pipe(changed(IMAGES_DIR))
    .pipe(gulp.dest(IMAGES_DIR));
});

gulp.task(
  'watch-images',
  gulp.series('build-images', function watchImages() {
    gulp.watch(imageFiles, gulp.task('build-images'));
  })
);

gulp.task('watch-templates', function() {
  gulp.watch(TEMPLATES_DIR + '/*.html', function(file) {
    liveReloadServer.notifyChanged([file.path]);
  });
});

const MANIFEST_SOURCE_FILES =
  'build/@(fonts|images|scripts|styles)/*.@(js|css|woff|jpg|png|svg)';

let prevManifest = {};

/**
 * Return an array of asset paths that changed between
 * two versions of a manifest.
 */
function changedAssets(prevManifest, newManifest) {
  return Object.keys(newManifest).filter(function(asset) {
    return newManifest[asset] !== prevManifest[asset];
  });
}

const debouncedLiveReload = debounce(function() {
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

let isFirstBuild = true;

/**
 * Generates the `build/boot.js` script which serves as the entry point for
 * the Hypothesis client.
 *
 * @param {Object} manifest - Manifest mapping asset paths to cache-busted URLs
 */
function generateBootScript(manifest) {
  const { version } = require('./package.json');

  const defaultSidebarAppUrl = process.env.SIDEBAR_APP_URL
    ? `${process.env.SIDEBAR_APP_URL}`
    : 'http://localhost:5000/app.html';

  let defaultAssetRoot;

  if (process.env.NODE_ENV === 'production') {
    defaultAssetRoot = `https://cdn.hypothes.is/hypothesis/${version}/`;
  } else {
    const scheme = useSsl ? 'https' : 'http';
    defaultAssetRoot = `${scheme}://${packageServerHostname()}:3001/hypothesis/${version}/`;
  }

  if (isFirstBuild) {
    gulpUtil.log(`Sidebar app URL: ${defaultSidebarAppUrl}`);
    gulpUtil.log(`Client asset root URL: ${defaultAssetRoot}`);
    isFirstBuild = false;
  }

  gulp
    .src('build/scripts/boot.bundle.js')
    .pipe(replace('__MANIFEST__', JSON.stringify(manifest)))
    .pipe(replace('__ASSET_ROOT__', defaultAssetRoot))
    .pipe(replace('__SIDEBAR_APP_URL__', defaultSidebarAppUrl))
    // Strip sourcemap link. It will have been invalidated by the previous
    // replacements and the bundle is so small that it isn't really valuable.
    .pipe(replace(/^\/\/# sourceMappingURL=\S+$/m, ''))
    .pipe(rename('boot.js'))
    .pipe(gulp.dest('build/'));
}

/**
 * Generate a JSON manifest mapping file paths to
 * URLs containing cache-busting query string parameters.
 */
function generateManifest() {
  return gulp
    .src(MANIFEST_SOURCE_FILES)
    .pipe(manifest({ name: 'manifest.json' }))
    .pipe(
      through.obj(function(file, enc, callback) {
        // Trigger a reload of the client in the dev server at localhost:3000
        const newManifest = JSON.parse(file.contents.toString());
        const changed = changedAssets(prevManifest, newManifest);
        prevManifest = newManifest;
        triggerLiveReload(changed);

        // Expand template vars in boot script bundle
        generateBootScript(newManifest);

        this.push(file);
        callback();
      })
    )
    .pipe(gulp.dest('build/'));
}

gulp.task('watch-manifest', function() {
  gulp.watch(MANIFEST_SOURCE_FILES, { delay: 500 }, generateManifest);
});

gulp.task('serve-package', function() {
  servePackage(3001, packageServerHostname());
});

gulp.task('serve-live-reload', function() {
  const LiveReloadServer = require('./scripts/gulp/live-reload-server');
  const scheme = useSsl ? 'https' : 'http';
  liveReloadServer = new LiveReloadServer(3000, {
    clientUrl: `${scheme}://${packageServerHostname()}:3001/hypothesis`,
  });
});

const buildAssets = gulp.parallel(
  'build-js',
  'build-css',
  'build-fonts',
  'build-images'
);
gulp.task('build', gulp.series(buildAssets, generateManifest));

gulp.task(
  'watch',
  gulp.parallel(
    'serve-package',
    'serve-live-reload',
    'watch-js',
    'watch-css',
    'watch-fonts',
    'watch-images',
    'watch-manifest',
    'watch-templates'
  )
);

function runKarma(baseConfig, opts, done) {
  // See https://github.com/karma-runner/karma-mocha#configuration
  const cliOpts = {
    client: {
      mocha: {
        grep: taskArgs.grep,
      },
    },
  };

  // Work around a bug in Karma 1.10 which causes console log messages not to
  // be displayed when using a non-default reporter.
  // See https://github.com/karma-runner/karma/pull/2220
  const BaseReporter = require('karma/lib/reporters/base');
  BaseReporter.decoratorFactory.$inject = BaseReporter.decoratorFactory.$inject.map(
    dep => dep.replace('browserLogOptions', 'browserConsoleLogOptions')
  );

  const karma = require('karma');
  new karma.Server(
    Object.assign(
      {},
      {
        configFile: path.resolve(__dirname, baseConfig),
      },
      cliOpts,
      opts
    ),
    done
  ).start();
}

gulp.task('test', function(callback) {
  runKarma('./src/karma.config.js', { singleRun: true }, callback);
});

gulp.task('test-watch', function(callback) {
  runKarma('./src/karma.config.js', {}, callback);
});

gulp.task(
  'upload-sourcemaps',
  gulp.series('build-js', function() {
    const uploadToSentry = require('./scripts/gulp/upload-to-sentry');

    const opts = {
      key: getEnv('SENTRY_API_KEY'),
      organization: getEnv('SENTRY_ORGANIZATION'),
    };
    const projects = getEnv('SENTRY_PROJECTS').split(',');
    const release = getEnv('SENTRY_RELEASE_VERSION');

    return gulp
      .src(['build/scripts/*.js', 'build/scripts/*.map'])
      .pipe(uploadToSentry(opts, projects, release));
  })
);
