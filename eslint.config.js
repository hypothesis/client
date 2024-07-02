import hypothesis from 'eslint-config-hypothesis';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.tox/**/*',
      '.yalc/**/*',
      '.yarn/**/*',
      'build/**/*',
      '**/vendor/**/*.js',
      '**/coverage/**/*',
      'docs/_build/*',
      'dev-server/static/**/*.js',
    ],
  },
  ...hypothesis,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      'prefer-arrow-callback': [
        'error',
        {
          allowNamedFunctions: true,
        },
      ],

      'object-shorthand': ['error', 'properties'],
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-use-before-define': 'off',

      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: false,
          typedefs: false,
          ignoreTypeReferences: false,
        },
      ],

      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

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
