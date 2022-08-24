/* global __dirname, process */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

let chromeFlags = [];

// eslint-disable-next-line @typescript-eslint/no-var-requires
process.env.CHROME_BIN = require('puppeteer').executablePath();

if (process.env.RUNNING_IN_DOCKER) {
  // In Docker, the tests run as root, so the sandbox must be disabled.
  chromeFlags.push('--no-sandbox');

  // Disable `/dev/shm` usage as this can cause Chrome to fail to load large
  // HTML pages.
  //
  // See https://github.com/GoogleChrome/puppeteer/issues/1834 and
  // https://github.com/karma-runner/karma-chrome-launcher/issues/198.
  chromeFlags.push('--disable-dev-shm-usage');

  // Use Chromium from Alpine packages. The one that Puppeteer downloads won't
  // load in Alpine.
  process.env.CHROME_BIN = 'chromium-browser';
}

module.exports = function (config) {
  config.set({
    // Base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: './',

    frameworks: ['mocha', 'chai', 'sinon', 'source-map-support'],

    files: [
      // Empty HTML file to assist with some tests
      { pattern: './annotator/test/empty.html', watched: false },

      // Test bundles.
      { pattern: '../build/scripts/tests.bundle.js', type: 'module' },

      // Sourcemaps for test bundles.
      { pattern: '../build/scripts/*.js.map', included: false },

      // CSS bundles, relied upon by accessibility tests (eg. for color-contrast
      // checks).
      {
        pattern: '../build/styles/{annotator,sidebar}.css',
        watched: false,
      },
    ],

    mochaReporter: {
      // Display a helpful diff when comparing complex objects
      // See https://www.npmjs.com/package/karma-mocha-reporter#showdiff
      showDiff: true,

      // Output only summary and errors in development to make output easier to parse.
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
    reporters: ['progress', 'mocha', 'coverage-istanbul'],

    browserConsoleLogOptions: {
      level: 'log',
      format: '%b %T: %m',
      terminal: true,
    },

    browsers: ['ChromeHeadless_Custom'],
    browserNoActivityTimeout: 20000,

    customLaunchers: {
      ChromeHeadless_Custom: {
        base: 'ChromeHeadless',
        flags: chromeFlags,
      },
    },

    // Log slow tests so we can fix them before they timeout
    reportSlowerThan: 500,
  });
};
