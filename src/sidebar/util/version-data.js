'use strict';

/**
 * Build version data object for current session and client
 *
 * @param {Object} auth - Object representing auth state and user information
 * @param {Object} mainFrame - The main frame of the app
 * @return {Object}
 */
const getVersionData = (auth, mainFrame) => {
  const hasFingerprint =
    mainFrame && mainFrame.metadata && mainFrame.metadata.documentFingerprint;

  const currentURL = mainFrame && mainFrame.uri ? mainFrame.uri : '...';

  const userString = (() => {
    if (auth.username && auth.displayName) {
      return `${auth.displayName} (${auth.username})`;
    } else if (auth.username) {
      return auth.username;
    }
    return 'N/A';
  })();

  const versionData = (() => {
    return {
      fingerprint: hasFingerprint
        ? mainFrame.metadata.documentFingerprint
        : 'N/A',
      timestamp: new Date().toString(),
      url: currentURL,
      username: userString,
      userAgent: window.navigator.userAgent,
      version: '__VERSION__',
    };
  })();

  return versionData;
};

module.exports = getVersionData;
