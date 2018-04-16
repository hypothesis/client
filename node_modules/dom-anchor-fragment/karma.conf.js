var fs = require('fs');

module.exports = function(config) {
  config.set({
    browsers: ['PhantomJS'],
    frameworks: [
      'fixture',
      'browserify',
      'chai',
      'mocha',
      'source-map-support'
    ],
    files: [
      'test/*.spec.js',
      'test/fixtures/*.html'
    ],
    reporters: ['progress', 'coverage'].concat(
      (process.env.COVERALLS_REPO_TOKEN ? ['coveralls'] : [])),
    preprocessors: {
      'test/*.spec.js': ['browserify'],
      'test/fixtures/*.html': ['html2js']
    },
    browserify: {
      debug: true,
      transform: ['babelify', 'browserify-istanbul']
    },
    coverageReporter: {
      reporters: [
        {type: 'lcovonly'},
        {type: 'text'}
      ]
    },
    singleRun: true
  });
};
