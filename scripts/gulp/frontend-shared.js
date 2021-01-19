'use strict';

const cp = require('child_process');
const fs = require('fs');
const gulp = require('gulp');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');

const buildFrontendSharedJs = () => {
  // There does not appear to be a simple way of forcing gulp-babel to use a config
  // file. Load it up as JSON and pass it in manually.
  const babelConfig = JSON.parse(
    fs.readFileSync('./frontend-shared/babel.config.json')
  );

  return (
    gulp
      .src('frontend-shared/src/*')
      // Transpile the js source files and write the output in the frontend-shared/lib dir.
      // Additionally, add the sourcemaps into the same dir.
      .pipe(sourcemaps.init())
      .pipe(babel(babelConfig))
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('frontend-shared/lib'))
  );
};

const linkFrontendShared = done => {
  // Setup a symlink from the client to the frontend-shared package.
  cp.spawn('yarn', ['link'], {
    env: process.env,
    cwd: './frontend-shared',
  }).on('exit', () => {
    cp.spawn('yarn', ['link', '@hypothesis/frontend-shared'], {
      env: process.env,
      stdio: 'inherit',
    }).on('exit', () => {
      done();
    });
  });
};

module.exports = {
  buildFrontendSharedJs,
  linkFrontendShared,
};
