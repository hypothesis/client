'use strict';

const queryString = require('query-string');

/**
 * Return the app configuration specified by the frame embedding the Hypothesis
 * client.
 */
function hostPageConfig(window) {
  const configJSON = queryString.parse(window.location.search).config;
  const config = JSON.parse(configJSON || '{}');

  // temp: hack to force user
  config.focusedUser = 'kyle';

  // Known configuration parameters which we will import from the host page.
  // Note that since the host page is untrusted code, the filtering needs to
  // be done here.
  const paramWhiteList = [
    // Direct-linked annotation ID
    'annotations',

    // Direct-linked group ID
    'group',

    // Default query passed by url
    'query',

    // Config param added by the extension, Via etc.  indicating how Hypothesis
    // was added to the page.
    'appType',

    // Config params documented at
    // https://h.readthedocs.io/projects/client/en/latest/publishers/config/
    'openSidebar',
    'showHighlights',
    'services',
    'branding',

    // New note button override.
    // This should be removed once new note button is enabled for everybody.
    'enableExperimentalNewNoteButton',

    // Forces the sidebar to filter annotations to a single user.
    'focusedUser',

    // Fetch config from a parent frame.
    'requestConfigFromFrame',

    // Theme which can either be specified as 'clean'.
    // If nothing is the specified the classic look is applied.
    'theme',

    'usernameUrl',
  ];

  return Object.keys(config).reduce(function(result, key) {
    if (paramWhiteList.indexOf(key) !== -1) {
      // Ignore `null` values as these indicate a default value.
      // In this case the config value set in the sidebar app HTML config is
      // used.
      if (config[key] !== null) {
        result[key] = config[key];
      }
    }
    return result;
  }, {});
}

module.exports = hostPageConfig;
