'use strict';

const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');

const { run } = require('./run');

const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production';

const buildFrontendSharedJs = () => {
  // There does not appear to be a simple way of forcing gulp-babel to use a config
  // file. Load it up and pass it in manually.
  const babelConfig = require('../../frontend-shared/.babelrc.cjs');

  // Transpile the js source files and write the output in the frontend-shared/lib dir.
  console.log(IS_PRODUCTION_BUILD);
  let stream = gulp.src(['frontend-shared/src/**/*.js', '!**/test/*.js']);
  if (!IS_PRODUCTION_BUILD) {
    // Build the sourcemaps (non-production)
    stream = stream
      .pipe(sourcemaps.init())
      .pipe(babel(babelConfig))
      .pipe(sourcemaps.write('.'));
  } else {
    // No sourcemaps (production)
    stream = stream.pipe(babel(babelConfig));
  }
  stream.pipe(gulp.dest('frontend-shared/lib'));
  return stream;
};

const buildFrontendSharedTypes = async () => {
  // nb. If the options get significantly more complex, they should be moved to
  // a `tsconfig.json` file.
  await run('node_modules/.bin/tsc', [
    '--allowJs',
    '--declaration',
    '--emitDeclarationOnly',
    '--outDir',
    'frontend-shared/lib',
    'frontend-shared/src/index.js',
  ]);
};

const linkFrontendShared = async () => {
  // Make @hypothesis/frontend-shared available for linking in other projects.
  await run('yarn', ['link'], { cwd: './frontend-shared' });

  // Link it in the parent `client` repo.
  await run('yarn', ['link', '@hypothesis/frontend-shared']);
};

module.exports = {
  buildFrontendSharedJs,
  buildFrontendSharedTypes,
  linkFrontendShared,
};
