/* global process */

'use strict';

/* global __dirname */

const path = require('path');
const envify = require('loose-envify/custom');

let chromeFlags = [];
process.env.CHROME_BIN = require('puppeteer').executablePath();

// On Travis and in Docker, the tests run as root, so the sandbox must be
// disabled.
if (process.env.TRAVIS || process.env.RUNNING_IN_DOCKER) {
  chromeFlags.push('--no-sandbox');
}

if (process.env.RUNNING_IN_DOCKER) {
  // Disable `/dev/shm` usage as this can cause Chrome to fail to load large
  // HTML pages, such as the one Karma creates with all the tests loaded.
  //
  // See https://github.com/GoogleChrome/puppeteer/issues/1834 and
  // https://github.com/karma-runner/karma-chrome-launcher/issues/198.
  chromeFlags.push('--disable-dev-shm-usage');

  // Use Chromium from Alpine packages. The one that Puppeteer downloads won't
  // load in Alpine.
  process.env.CHROME_BIN = 'chromium-browser';
}

module.exports = function(config) {
  config.set({
    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'mocha', 'chai', 'sinon'],

    // list of files / patterns to load in the browser
    files: [
      // Test setup
      './sidebar/test/bootstrap.js',

      // Empty HTML file to assist with some tests
      { pattern: './annotator/test/empty.html', watched: false },

      // Karma watching is disabled for these files because they are
      // bundled with karma-browserify which handles watching itself via
      // watchify

      // Unit tests
      {
        pattern: 'annotator/**/*-test.coffee',
        watched: false,
        included: true,
        served: true,
      },
      {
        pattern: '**/test/*-test.js',
        watched: false,
        included: true,
        served: true,
      },

      // Integration tests
      {
        pattern: '**/integration/*-test.js',
        watched: false,
        included: true,
        served: true,
      },
    ],

    // list of files to exclude
    exclude: [],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      './shared/polyfills/*.js': ['browserify'],
      './sidebar/test/bootstrap.js': ['browserify'],
      '**/*-test.js': ['browserify'],
      '**/*-test.coffee': ['browserify'],
      '**/*-it.js': ['browserify'],
    },

    browserify: {
      debug: true,
      extensions: ['.coffee'],
      transform: [
        'coffeeify',
        [
          'babelify',
          {
            // The transpiled CoffeeScript is fed through Babelify to add
            // code coverage instrumentation for Istanbul.
            extensions: ['.js', '.coffee'],
            plugins: [
              'mockable-imports',
              [
                'babel-plugin-istanbul',
                {
                  exclude: ['**/test/**/*.{coffee,js}'],
                },
              ],
            ],
          },
        ],
        // Enable debugging checks in libraries that use `NODE_ENV` guards.
        [envify({ NODE_ENV: 'development' }), { global: true }],
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
    browsers: ['ChromeHeadless_Custom'],
    browserNoActivityTimeout: 20000, // Travis is slow...

    customLaunchers: {
      ChromeHeadless_Custom: {
        base: 'ChromeHeadless',
        flags: chromeFlags,
      },
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Log slow tests so we can fix them before they timeout
    reportSlowerThan: 500,
  });
};
