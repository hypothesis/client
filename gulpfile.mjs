import { existsSync, readFileSync } from 'fs';

import {
  buildCSS,
  buildJS,
  runTests,
  watchJS,
} from '@hypothesis/frontend-build';
import changed from 'gulp-changed';
import log from 'fancy-log';
import gulp from 'gulp';
import replace from 'gulp-replace';
import rename from 'gulp-rename';
import through from 'through2';

import manifest from './scripts/gulp/manifest.js';
import serveDev from './dev-server/serve-dev.js';
import servePackage from './dev-server/serve-package.js';

gulp.task('build-js', () => buildJS('./rollup.config.mjs'));

gulp.task('watch-js', () => watchJS('./rollup.config.mjs'));

gulp.task('build-css', () =>
  buildCSS([
    // Hypothesis client
    './src/styles/annotator/annotator.scss',
    './src/styles/annotator/pdfjs-overrides.scss',
    './src/styles/sidebar/sidebar.scss',

    // Vendor
    './node_modules/katex/dist/katex.min.css',

    // Development tools
    './src/styles/ui-playground/ui-playground.scss',
  ])
);

gulp.task(
  'watch-css',
  gulp.series('build-css', function watchCSS() {
    gulp.watch(
      ['node_modules/katex/dist/katex.min.css', 'src/styles/**/*.scss'],
      gulp.task('build-css')
    );
  })
);

const fontFiles = ['node_modules/katex/dist/fonts/*.woff2'];

gulp.task('build-fonts', () => {
  // Fonts are located in a subdirectory of `build/styles` so that we can reuse
  // KaTeX's CSS bundle directly without any URL rewriting.
  const fontsDir = 'build/styles/fonts';
  return gulp.src(fontFiles).pipe(changed(fontsDir)).pipe(gulp.dest(fontsDir));
});

gulp.task(
  'watch-fonts',
  gulp.series('build-fonts', function watchFonts() {
    gulp.watch(fontFiles, gulp.task('build-fonts'));
  })
);

// Files to reference in `build/manifest.json`, used by `build/boot.js`.
const MANIFEST_SOURCE_FILES = 'build/{styles,scripts}/*.{js,css,map}';

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

  const { version } = JSON.parse(readFileSync('./package.json').toString());

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

// Unit and integration testing tasks.
//
// Some (eg. a11y) tests rely on CSS bundles. We assume that JS will always take
// longer to build than CSS, so build in parallel.
gulp.task(
  'test',
  gulp.parallel('build-css', () =>
    runTests({
      bootstrapFile: 'src/sidebar/test/bootstrap.js',
      karmaConfig: 'src/karma.config.js',
      rollupConfig: 'rollup-tests.config.mjs',
      testsPattern: 'src/**/*-test.js',
    })
  )
);
