/* eslint-env node */

'use strict';

const { mkdirSync, readdirSync } = require('fs');
const path = require('path');

const changed = require('gulp-changed');
const commander = require('commander');
const log = require('fancy-log');
const gulp = require('gulp');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const through = require('through2');

const createBundle = require('./scripts/gulp/create-bundle');
const createStyleBundle = require('./scripts/gulp/create-style-bundle');
const {
  buildFrontendSharedJs,
  linkFrontendShared,
} = require('./scripts/gulp/frontend-shared');
const manifest = require('./scripts/gulp/manifest');
const serveDev = require('./dev-server/serve-dev');
const servePackage = require('./dev-server/serve-package');
const vendorBundles = require('./scripts/gulp/vendor-bundles');

const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';
const SCRIPT_DIR = 'build/scripts';
const STYLE_DIR = 'build/styles';
const FONTS_DIR = 'build/fonts';
const IMAGES_DIR = 'build/images';

function parseCommandLine() {
  commander
    .option(
      '--grep [pattern]',
      'Run only tests where filename matches a pattern'
    )
    .parse(process.argv);

  return {
    grep: commander.grep,
  };
}

const taskArgs = parseCommandLine();

/** A list of all modules included in vendor bundles. */
const vendorModules = Object.keys(vendorBundles.bundles).reduce(function (
  deps,
  key
) {
  return deps.concat(vendorBundles.bundles[key]);
},
[]);

// Builds the bundles containing vendor JS code
gulp.task('build-vendor-js', function () {
  const finished = [];
  Object.keys(vendorBundles.bundles).forEach(function (name) {
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
    transforms: ['babel'],
  },
];

// Polyfill bundles. Polyfills are grouped into "sets" (one bundle per set)
// based on major ECMAScript version or DOM API. Some large polyfills
// (eg. for String.prototype.normalize) are additionally separated out into
// their own bundles.
//
// To add a new polyfill:
//  - Add the relevant dependencies to the project
//  - Create an entry point in `src/boot/polyfills/{set}` and a feature
//    detection function in `src/boot/polyfills/index.js`
//  - Add the polyfill set name to the required dependencies for the parts of
//    the client that need it in `src/boot/boot.js`
const polyfillBundles = readdirSync('./src/boot/polyfills/')
  .filter(name => name.endsWith('.js') && name !== 'index.js')
  .map(name => name.replace(/\.js$/, ''))
  .map(set => ({
    name: `polyfills-${set}`,
    entry: `./src/boot/polyfills/${set}`,
    transforms: ['babel'],
  }));

const appBundleConfigs = appBundles.concat(polyfillBundles).map(config => {
  return Object.assign({}, appBundleBaseConfig, config);
});

gulp.task(
  'build-js',
  gulp.parallel('build-vendor-js', function () {
    return Promise.all(
      appBundleConfigs.map(function (config) {
        return createBundle(config);
      })
    );
  })
);

gulp.task(
  'watch-js',
  gulp.series('build-vendor-js', function watchJS() {
    appBundleConfigs.forEach(function (config) {
      createBundle(config, { watch: true });
    });
  })
);

gulp.task('build-frontend-shared-js', buildFrontendSharedJs);

gulp.task('link-frontend-shared', linkFrontendShared);

gulp.task(
  'build-frontend-shared',
  gulp.series('build-frontend-shared-js', 'link-frontend-shared')
);

gulp.task('watch-frontend-shared', () => {
  gulp.watch('./frontend-shared/src/**', gulp.series(buildFrontendSharedJs));
});

const cssBundles = [
  // H
  './src/styles/annotator/annotator.scss',
  './src/styles/annotator/pdfjs-overrides.scss',
  './src/styles/sidebar/sidebar.scss',

  // Vendor
  './node_modules/katex/dist/katex.min.css',
];

gulp.task('build-css', function () {
  mkdirSync(STYLE_DIR, { recursive: true });
  const bundles = cssBundles.map(entry =>
    createStyleBundle({
      input: entry,
      output: `${STYLE_DIR}/${path.basename(entry, path.extname(entry))}.css`,
      minify: IS_PRODUCTION_BUILD,
    })
  );
  return Promise.all(bundles);
});

gulp.task(
  'watch-css',
  gulp.series('build-css', function watchCSS() {
    const vendorCSS = cssBundles.filter(path => path.endsWith('.css'));
    const styleFileGlobs = vendorCSS.concat('./src/styles/**/*.scss');

    gulp.watch(styleFileGlobs, gulp.task('build-css'));
  })
);

const fontFiles = [
  'src/styles/vendor/fonts/*.woff',
  'node_modules/katex/dist/fonts/*.woff',
  'node_modules/katex/dist/fonts/*.woff2',
];

gulp.task('build-fonts', function () {
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
gulp.task('build-images', function () {
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

const MANIFEST_SOURCE_FILES =
  'build/@(fonts|images|scripts|styles)/*.@(js|css|woff|jpg|png|svg)';

let isFirstBuild = true;

/**
 * Generates the `build/boot.js` script which serves as the entry point for
 * the Hypothesis client.
 *
 * @param {Object} manifest - Manifest mapping asset paths to cache-busted URLs
 * @param {Object} options - Options for generating the boot script
 */
function generateBootScript(manifest, { usingDevServer = false } = {}) {
  const { version } = require('./package.json');

  const defaultNotebookAppUrl = process.env.NOTEBOOK_APP_URL
    ? `${process.env.NOTEBOOK_APP_URL}`
    : '{current_scheme}://{current_host}:5000/notebook';

  const defaultSidebarAppUrl = process.env.SIDEBAR_APP_URL
    ? `${process.env.SIDEBAR_APP_URL}`
    : '{current_scheme}://{current_host}:5000/app.html';

  let defaultAssetRoot;

  if (process.env.NODE_ENV === 'production' && !usingDevServer) {
    defaultAssetRoot = 'https://cdn.hypothes.is/hypothesis';
  } else {
    defaultAssetRoot = '{current_scheme}://{current_host}:3001/hypothesis';
  }
  defaultAssetRoot = `${defaultAssetRoot}/${version}/`;

  if (isFirstBuild) {
    log(`Sidebar app URL: ${defaultSidebarAppUrl}`);
    log(`Notebook app URL: ${defaultNotebookAppUrl}`);
    log(`Client asset root URL: ${defaultAssetRoot}`);
    isFirstBuild = false;
  }

  gulp
    .src('build/scripts/boot.bundle.js')
    .pipe(replace('__MANIFEST__', JSON.stringify(manifest)))
    .pipe(replace('__ASSET_ROOT__', defaultAssetRoot))
    .pipe(replace('__NOTEBOOK_APP_URL__', defaultNotebookAppUrl))
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
function generateManifest(opts) {
  return gulp
    .src(MANIFEST_SOURCE_FILES)
    .pipe(manifest({ name: 'manifest.json' }))
    .pipe(
      through.obj(function (file, enc, callback) {
        const newManifest = JSON.parse(file.contents.toString());

        // Expand template vars in boot script bundle
        generateBootScript(newManifest, opts);

        this.push(file);
        callback();
      })
    )
    .pipe(gulp.dest('build/'));
}

gulp.task('watch-manifest', function () {
  gulp.watch(MANIFEST_SOURCE_FILES, { delay: 500 }, function updateManifest() {
    return generateManifest({ usingDevServer: true });
  });
});

gulp.task('serve-package', function () {
  servePackage(3001);
});

gulp.task('serve-test-pages', function () {
  serveDev(3000, { clientUrl: `//{current_host}:3001/hypothesis` });
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
    'serve-test-pages',
    'watch-js',
    'watch-css',
    'watch-fonts',
    'watch-images',
    'watch-manifest',
    'watch-frontend-shared',
    'link-frontend-shared'
  )
);

function runKarma({ singleRun }, done) {
  const karma = require('karma');
  new karma.Server(
    {
      configFile: path.resolve(__dirname, './src/karma.config.js'),
      grep: taskArgs.grep,
      singleRun,
    },
    done
  ).start();
}

// Unit and integration testing tasks.
// Some (eg. a11y) tests rely on CSS bundles, so build these first.
gulp.task(
  'test',
  gulp.series('build-css', done => runKarma({ singleRun: true }, done))
);
gulp.task(
  'test-watch',
  gulp.series('build-css', done => runKarma({ singleRun: false }, done))
);
