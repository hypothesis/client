'use strict';

const shownWarnings = {};

/**
 * Log a warning if it has not already been reported.
 *
 * @param {string} warning
 */
function warnOnce(warning) {
  if (warning in shownWarnings) {
    return;
  }
  console.warn(warning);
  shownWarnings[warning] = true;
}

module.exports = warnOnce;
