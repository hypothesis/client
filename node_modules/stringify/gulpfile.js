'use strict';
var gulp          = require('gulp'),
    jshint        = require('gulp-jshint'),
    mocha         = require('gulp-mocha'),
    stylish       = require('jshint-stylish');

gulp.task('lint', function () {
  return gulp.src([
      './*.js',
      './src/**/*.js',
      './test/**/*.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', function () {
  process.env.NODE_ENV = true;

  return gulp.src('./src/**/*.js')
    .on('finish', function () {
      return gulp.src('./test/**/*.js', {
        read: false
      })
      .pipe(mocha({
        reporter: 'spec'
      }));
    });
});

gulp.task('default', ['lint', 'test']);
