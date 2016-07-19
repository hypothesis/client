#!/usr/bin/env node

'use strict';

/**
 * A utility script to find CSS rules which do not appear to be used in the
 * app's UI components.
 */

const purify = require('purify-css');

const contentFiles = [
  './h/**/*.js',
  './h/**/*.html',
];

const cssFiles = ['./build/styles/app.css'];

const options = {
  output: false,

  // Log rejected selectors
  rejected: true,

  // Whitelist of selectors that should be assumed to be used
  whitelist: [
    // Selectors for rendered markdown in annotation bodies
    '*markdown-body*',
    '*styled-text*',

    // ngTagsInput selectors
    '*tags-input*',

    // Selectors for JavaScript-set 'is-$state' classes
    '*is-*',

    // Selectors which are used in app.html.
    // These entries can be removed once the content of app.html is moved from
    // app.html.jinja2 in the h repository to this repository.
    'create-account-banner*',
  ],
};

purify(contentFiles, cssFiles, options);

