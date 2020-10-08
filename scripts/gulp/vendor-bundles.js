'use strict';

/**
 * Defines a set of vendor bundles which are
 * libraries of 3rd-party code referenced by
 * one or more bundles of the Hypothesis client/frontend.
 */

module.exports = {
  bundles: {
    katex: ['katex'],
    sentry: ['@sentry/browser'],
    showdown: ['showdown'],
  },

  // List of modules to exclude from parsing for require() statements.
  //
  // Modules may be excluded from parsing for two reasons:
  //
  // 1. The module is large and contains no require statements,
  //    so skipping parsing speeds up the build process.
  // 2. The module is itself a compiled Browserify bundle containing
  //    internal require() statements, which should not be processed
  //    when including the bundle in another project.
  noParseModules: [],
};
