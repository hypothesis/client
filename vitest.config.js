import { SummaryReporter } from '@hypothesis/frontend-testing/vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { excludeFromCoverage } from './rollup-tests.config.js';

export default defineConfig({
  test: {
    globals: true,
    reporters: [new SummaryReporter()],

    browser: {
      provider: 'playwright',
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1024, height: 768 },
    },

    // CSS bundles, relied upon by accessibility tests (eg. for color-contrast
    // checks).
    setupFiles: ['./build/styles/annotator.css', './build/styles/sidebar.css'],
    include: [
      // Test bundle
      './build/scripts/tests.bundle.js',
    ],

    coverage: {
      enabled: true,
      provider: 'istanbul',
      reportsDirectory: './coverage',
      reporter: ['json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: excludeFromCoverage,
    },

    alias: {
      '@hypothesis/annotations-ui': path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        'src/annotations-ui',
      ),
    },
  },
});
