import hypothesisBase from 'eslint-config-hypothesis/base';
import hypothesisJSX from 'eslint-config-hypothesis/jsx';
import hypothesisTS from 'eslint-config-hypothesis/ts';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig(
  globalIgnores([
    '.tox/**/*',
    '.yalc/**/*',
    '.yarn/**/*',
    'build/**/*',
    '**/vendor/**/*.js',
    '**/coverage/**/*',
    'docs/_build/*',
    'dev-server/static/**/*.js',
  ]),

  hypothesisBase,
  hypothesisJSX,
  hypothesisTS,

  // Annotator module
  {
    files: ['src/annotator/**/*.{js|tx|tsx}'],
    rules: {
      'no-restricted-properties': [
        2,
        {
          // Disable `bind` usage in annotator/ code to prevent unexpected behavior
          // due to broken bind polyfills. See
          // https://github.com/hypothesis/client/issues/245
          property: 'bind',
          message:
            'Use function expressions instead of bind() in annotator/ code',
        },
      ],
    },
  },

  // Scripts and configuration files
  {
    files: ['**/*.js'],
    ignores: ['src/**'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      'no-console': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
