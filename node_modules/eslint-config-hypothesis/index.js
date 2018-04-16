'use strict';

module.exports = {
  env: {
    mocha: true,
    commonjs: true,
    browser: true,
  },
  extends: 'eslint:recommended',
  globals: {
    assert: false,
    sinon: false,
    Promise: false,
  },
  rules: {
    'array-callback-return': "error",
    'block-scoped-var': "error",
    'comma-dangle': ["error", "always-multiline"],
    'consistent-this': ["error", "self"],
    'consistent-return': "error",
    'curly': "error",
    'dot-notation': "error",
    'eqeqeq': "error",
    'guard-for-in': "error",
    'indent': ["error", 2],
    'new-cap': "error",
    'no-caller': "error",
    'no-case-declarations': "error",
    'no-console': [
      'error',
      { allow: ['warn', "error"] },
    ],
    'no-extra-bind': "error",
    'no-lone-blocks': "error",
    'no-lonely-if': "error",
    'no-multiple-empty-lines': "error",
    'no-self-compare': "error",
    'no-throw-literal': "error",
    'no-undef-init': "error",
    'no-unneeded-ternary': "error",
    'no-unused-expressions': "error",
    'no-use-before-define': [
      'error',
      {functions: false},
    ],
    'no-useless-concat': "error",
    'one-var-declaration-per-line': ["error", "always"],
    'quotes': ["error", "single", {"avoidEscape": true}],
    'semi': "error",
    'strict': ["error", "safe"],
  },
  parserOptions: {
    ecmaVersion: 6,
  }
};

