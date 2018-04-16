var gulp = require('gulp');

var babel = require('gulp-babel');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');


gulp.task('default', function () {
  return gulp.src('FragmentAnchor.js')
    .pipe(sourcemaps.init())
    .pipe(babel({modules: 'umd'}))
    .pipe(sourcemaps.write({sourceRoot: './'}))
    .pipe(gulp.dest('dist'))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(uglify())
    .pipe(rename({extname: '.min.js'}))
    .pipe(sourcemaps.write('./', {sourceRoot: './'}))
    .pipe(gulp.dest('dist'))
});
