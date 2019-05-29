'use strict';

let shownWarnings = {};

/**
 * Log a warning if it has not already been reported.
 *
 * This is useful to avoid spamming the console if a warning is emitted in a
 * context that may be called frequently.
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

warnOnce.reset = () => {
  shownWarnings = {};
};

module.exports = warnOnce;
