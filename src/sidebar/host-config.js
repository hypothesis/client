'use strict';

var queryString = require('query-string');

/**
 * Return the app configuration specified by the frame embedding the Hypothesis
 * client.
 */
function hostPageConfig(window) {
  var configJSON = queryString.parse(window.location.search).config;
  var config = JSON.parse(configJSON || '{}');

  // Known configuration parameters which we will import from the host page.
  // Note that since the host page is untrusted code, the filtering needs to
  // be done here.
  var paramWhiteList = [
    // Direct-linked annotation ID
    'annotations',

    // Config param added by the extension, Via etc.  indicating how Hypothesis
    // was added to the page.
    'appType',

    // Config params documented at
    // https://github.com/hypothesis/client/blob/master/docs/config.md
    'openLoginForm',
    'openSidebar',
    'showHighlights',
    'services',
  ];

  return Object.keys(config).reduce(function (result, key) {
    if (paramWhiteList.indexOf(key) !== -1) {
      result[key] = config[key];
    }
    return result;
  }, {});
}

module.exports = hostPageConfig;
