import {
  buildCSS,
  buildJS,
  generateManifest,
  runTests,
  watchJS,
} from '@hypothesis/frontend-build';
import gulp from 'gulp';
import changed from 'gulp-changed';

import { serveDev } from './dev-server/serve-dev.js';
import { servePackage } from './dev-server/serve-package.js';
import { renderBootTemplate } from './scripts/render-boot-template.js';

gulp.task('build-js', () => buildJS('./rollup.config.js'));
gulp.task('watch-js', () => watchJS('./rollup.config.js'));

gulp.task('build-annotator-tailwind-css', () =>
  buildCSS(['./src/styles/annotator/annotator.css'], {
    autoprefixer: false,
    tailwind: true,
  }),
);

gulp.task('build-sidebar-tailwind-css', () =>
  buildCSS(
    [
      './src/styles/sidebar/sidebar.css',
      './src/styles/ui-playground/ui-playground.css',
    ],
    { autoprefixer: false, tailwind: true },
  ),
);

// Style bundles that don't use Tailwind.
gulp.task('build-standalone-css', () =>
  buildCSS(
    [
      './src/styles/annotator/highlights.scss',
      './src/styles/annotator/pdfjs-overrides.css',
      './node_modules/katex/dist/katex.min.css',
    ],
    { autoprefixer: false },
  ),
);

gulp.task(
  'build-css',
  gulp.parallel(
    'build-annotator-tailwind-css',
    'build-sidebar-tailwind-css',
    'build-standalone-css',
  ),
);

gulp.task(
  'watch-css',
  gulp.series('build-css', function watchCSS() {
    gulp.watch(
      [
        'node_modules/katex/dist/katex.min.css',
        'src/styles/**/*.scss',
        'src/styles/**/*.css',
        'src/**/*.tsx',
        'dev-server/ui-playground/**/*.tsx',
      ],
      gulp.task('build-css'),
    );
  }),
);

const fontFiles = ['node_modules/katex/dist/fonts/*.woff2'];

gulp.task('build-fonts', () => {
  // Fonts are located in a subdirectory of `build/styles` so that we can reuse
  // KaTeX's CSS bundle directly without any URL rewriting.
  const fontsDir = 'build/styles/fonts';
  return gulp
    .src(fontFiles, { encoding: false })
    .pipe(changed(fontsDir))
    .pipe(gulp.dest(fontsDir));
});

gulp.task(
  'watch-fonts',
  gulp.series('build-fonts', function watchFonts() {
    gulp.watch(fontFiles, gulp.task('build-fonts'));
  }),
);

// Files to reference in `build/manifest.json`, used by `build/boot.js`.
const manifestSourceFiles = 'build/{scripts,styles}/*.{css,js,map}';

gulp.task('build-boot-script', async () => {
  // Generate the manifest containing cache-busted asset URLs
  await generateManifest({ pattern: manifestSourceFiles });
  // Generate the boot script template
  await buildJS('./rollup-boot.config.js');
  // Replace variables in the template with real URLs
  renderBootTemplate('build/boot-template.js', 'build/boot.js');
});

gulp.task('watch-boot-script', () => {
  gulp.watch(
    [
      manifestSourceFiles,

      // This relies on the boot script only depending on modules in src/boot.
      //
      // We could alternatively use `watchJS` to rebuild the bundle, but we'd
      // need to make its logging less noisy first.
      'src/boot/**/*.{js,ts,tsx}',
    ],
    { delay: 500 },
    gulp.task('build-boot-script'),
  );
});

gulp.task('serve-package', () => {
  servePackage(3001);
});

gulp.task('serve-test-pages', () => {
  serveDev(3000, { clientUrl: `//{current_host}:3001/hypothesis` });
  // Starts an additional dev web server to test cross-origin functionality
  serveDev(3002, { clientUrl: `//{current_host}:3001/hypothesis` });
});

gulp.task(
  'build',
  gulp.series(
    gulp.parallel('build-js', 'build-css', 'build-fonts'),
    'build-boot-script',
  ),
);

gulp.task(
  'watch',
  gulp.parallel(
    'serve-package',
    'serve-test-pages',
    'watch-boot-script',
    'watch-css',
    'watch-fonts',
    'watch-js',
  ),
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
      vitestConfig: 'vitest.config.js',
      rollupConfig: 'rollup-tests.config.js',
      testsPattern: 'src/**/*-test.js',
    }),
  ),
);
