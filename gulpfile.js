/* eslint-env node */

'use strict';

const { existsSync, mkdirSync, writeFileSync } = require('fs');
const path = require('path');

const changed = require('gulp-changed');
const commander = require('commander');
const log = require('fancy-log');
const glob = require('glob');
const gulp = require('gulp');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const rollup = require('rollup');
const through = require('through2');

const createStyleBundle = require('./scripts/gulp/create-style-bundle');
const manifest = require('./scripts/gulp/manifest');
const serveDev = require('./dev-server/serve-dev');
const servePackage = require('./dev-server/serve-package');

const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';
const STYLE_DIR = 'build/styles';
const FONTS_DIR = 'build/fonts';

function parseCommandLine() {
  commander
    .option(
      '--grep <pattern>',
      'Run only tests where filename matches a regex pattern'
    )
    .option('--watch', 'Continuously run tests (default: false)', false)
    .option('--browser <browser>', 'Run tests in browser of choice.')
    .option(
      '--no-browser',
      "Don't launch default browser. Instead, navigate to http://localhost:9876/ to run the tests."
    )
    .parse(process.argv);

  const { grep, watch, browser } = commander.opts();
  const karmaOptions = {
    grep,
    singleRun: !watch,
  };

  // browser option can be either false | undefined | string
  if (browser === false) {
    karmaOptions.browsers = null;
  } else if (browser) {
    karmaOptions.browsers = [browser];
  }

  return karmaOptions;
}

const karmaOptions = parseCommandLine();

/** @param {import('rollup').RollupWarning} */
function logRollupWarning(warning) {
  log(`Rollup warning: ${warning} (${warning.url})`);
}

async function readConfig(path) {
  const { default: config } = await import(path);
  return Array.isArray(config) ? config : [config];
}

async function buildJS(rollupConfig) {
  const configs = await readConfig(rollupConfig);

  await Promise.all(
    configs.map(async config => {
      const bundle = await rollup.rollup({
        ...config,
        onwarn: logRollupWarning,
      });
      await bundle.write(config.output);
    })
  );
}

async function watchJS(rollupConfig) {
  const configs = await readConfig(rollupConfig);

  const watcher = rollup.watch(
    configs.map(config => ({
      ...config,
      onwarn: logRollupWarning,
    }))
  );

  return new Promise(resolve => {
    watcher.on('event', event => {
      switch (event.code) {
        case 'START':
          log('JS build starting...');
          break;
        case 'BUNDLE_END':
          event.result.close();
          break;
        case 'ERROR':
          log('JS build error', event.error);
          break;
        case 'END':
          log('JS build completed.');
          resolve(); // Resolve once the initial build completes.
          break;
      }
    });
  });
}

gulp.task('build-js', () => buildJS('./rollup.config.mjs'));

gulp.task('watch-js', () => watchJS('./rollup.config.mjs'));

const cssBundles = [
  // Hypothesis client
  './src/styles/annotator/annotator.scss',
  './src/styles/annotator/pdfjs-overrides.scss',
  './src/styles/sidebar/sidebar.scss',

  // Vendor
  './node_modules/katex/dist/katex.min.css',

  // Development tools
  './src/styles/ui-playground/ui-playground.scss',
];

gulp.task('build-css', () => {
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

gulp.task('build-fonts', () => {
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

const MANIFEST_SOURCE_FILES =
  'build/@(fonts|scripts|styles)/*.@(js|css|woff|jpg|png|svg)';

let isFirstBuild = true;

/**
 * Generates the `build/boot.js` script which serves as the entry point for
 * the Hypothesis client.
 *
 * @param {object} manifest - Manifest mapping asset paths to cache-busted URLs
 * @param {object} options - Options for generating the boot script
 */
function generateBootScript(manifest, { usingDevServer = false } = {}) {
  const bootBundle = 'build/scripts/boot.bundle.js';

  // In development, fail silently if the boot bundle has not yet been generated.
  // This function will be re-run after it is. In production, the boot bundle
  // should always have been generated first.
  if (usingDevServer && !existsSync(bootBundle)) {
    return;
  }

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
    .src(bootBundle)
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

gulp.task('watch-manifest', () => {
  gulp.watch(MANIFEST_SOURCE_FILES, { delay: 500 }, function updateManifest() {
    return generateManifest({ usingDevServer: true });
  });
});

gulp.task('serve-package', () => {
  servePackage(3001);
});

gulp.task('serve-test-pages', () => {
  serveDev(3000, { clientUrl: `//{current_host}:3001/hypothesis` });
  // Starts an additional dev web server to test cross-origin functionality
  serveDev(3002, { clientUrl: `//{current_host}:3001/hypothesis` });
});

const buildAssets = gulp.parallel('build-js', 'build-css', 'build-fonts');
gulp.task('build', gulp.series(buildAssets, generateManifest));

gulp.task(
  'watch',
  gulp.parallel(
    'serve-package',
    'serve-test-pages',
    'watch-js',
    'watch-css',
    'watch-fonts',
    'watch-manifest'
  )
);

async function buildAndRunTests() {
  const { grep, singleRun } = karmaOptions;

  // Generate an entry file for the test bundle. This imports all the test
  // modules, filtered by the pattern specified by the `--grep` CLI option.
  const testFiles = [
    'src/sidebar/test/bootstrap.js',
    ...glob
      .sync('src/**/*-test.js')
      .filter(path => (grep ? path.match(grep) : true)),
  ];

  const testSource = testFiles
    .map(path => `import "../../${path}";`)
    .join('\n');

  mkdirSync('build/scripts', { recursive: true });
  writeFileSync('build/scripts/test-inputs.js', testSource);

  // Build the test bundle.
  log(`Building test bundle... (${testFiles.length} files)`);
  if (singleRun) {
    await buildJS('./rollup-tests.config.mjs');
  } else {
    await watchJS('./rollup-tests.config.mjs');
  }

  // Run the tests.
  log('Starting Karma...');
  return new Promise(resolve => {
    const karma = require('karma');
    new karma.Server(
      karma.config.parseConfig(
        path.resolve(__dirname, './src/karma.config.js'),
        { singleRun }
      ),
      resolve
    ).start();

    process.on('SIGINT', () => {
      // Give Karma a chance to handle SIGINT and cleanup, but forcibly
      // exit if it takes too long.
      setTimeout(() => {
        resolve();
        process.exit(1);
      }, 5000);
    });
  });
}

// Unit and integration testing tasks.
//
// Some (eg. a11y) tests rely on CSS bundles. We assume that JS will always take
// longer to build than CSS, so build in parallel.
gulp.task('test', gulp.parallel('build-css', buildAndRunTests));
