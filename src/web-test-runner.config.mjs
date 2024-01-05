import { chromeLauncher } from '@web/test-runner-chrome';
import { defaultReporter } from '@web/test-runner';

export default (/** @type {import('@web/test-runner').TestRunnerConfig} */{
  rootDir: './',
  // files: './build/scripts/test/*-test.bundle.js',
  files: './build/scripts/tests.bundle.js',
  browsers: [chromeLauncher()],
  reporters: [defaultReporter()],

  coverage: true,
  coverageConfig: {
    reportDir: 'coverage-wtr', // TODO Set just 'coverage' once migration is done
    reporters: ['json', 'html'],
  },
});
