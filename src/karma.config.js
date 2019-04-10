'use strict';

/* global __dirname */

const path = require('path');

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'browserify',
      'mocha',
      'chai',
      'sinon',
    ],

    // list of files / patterns to load in the browser
    files: [
      // Polyfills for PhantomJS
      './shared/polyfills.js',

      // Test setup
      './sidebar/test/bootstrap.js',

      // Empty HTML file to assist with some tests
      { pattern: './annotator/test/empty.html', watched: false },

      // Karma watching is disabled for these files because they are
      // bundled with karma-browserify which handles watching itself via
      // watchify

      // Unit tests
      { pattern: 'annotator/**/*-test.coffee', watched: false, included: true, served: true },
      { pattern: '**/test/*-test.js', watched: false, included: true, served: true },

      // Integration tests
      { pattern: '**/integration/*-test.js', watched: false, included: true, served: true },
    ],

    // list of files to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      './shared/polyfills.js': ['browserify'],
      './sidebar/test/bootstrap.js': ['browserify'],
      '**/*-test.js': ['browserify'],
      '**/*-test.coffee': ['browserify'],
      '**/*-it.js': ['browserify'],
    },

    browserify: {
      debug: true,
      extensions: ['.coffee'],
      configure: function (bundle) {
        bundle.plugin('proxyquire-universal');
      },

      transform: [
        'coffeeify',
        ['babelify', {
          // The transpiled CoffeeScript is fed through Babelify to add
          // code coverage instrumentation for Istanbul.
          extensions: ['.js', '.coffee'],
          plugins: ['babel-plugin-istanbul'],
        }],
      ],
    },

    mochaReporter: {
      // Display a helpful diff when comparing complex objects
      // See https://www.npmjs.com/package/karma-mocha-reporter#showdiff
      showDiff: true,
      // Only show the total test counts and details for failed tests
      output: 'minimal',
    },

    coverageIstanbulReporter: {
      dir: path.join(__dirname, '../coverage'),
      reports: ['json', 'html'],
      'report-config': {
        json: { subdir: './' },
      },
    },

    // Use https://www.npmjs.com/package/karma-mocha-reporter
    // for more helpful rendering of test failures
    reporters: ['mocha', 'coverage-istanbul'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    browserConsoleLogOptions: {
      level: 'log',
      format: '%b %T: %m',
      terminal: true,
    },

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],
    browserNoActivityTimeout: 20000, // Travis is slow...

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Log slow tests so we can fix them before they timeout
    reportSlowerThan: 500,
  });
};
