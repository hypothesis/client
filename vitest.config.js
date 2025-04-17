import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      provider: 'playwright',
      enabled: true,
      headless: true,
      screenshotFailures: false,
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1024, height: 768 },
    },
    globals: true,

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
      reporter: ['json', 'clover', 'html', 'text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/test/**/*.js', '**/test-util/**'],
    },
  },
});
