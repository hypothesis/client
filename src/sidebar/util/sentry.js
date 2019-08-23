'use strict';

const Sentry = require('@sentry/browser');

/**
 * @typedef SentryConfig
 * @prop {string} dsn
 */

/**
 * Initialize the Sentry integration.
 *
 * This will activate Sentry and enable capturing of uncaught errors and
 * unhandled promise rejections.
 *
 * @param {SentryConfig} config
 */
function init(config) {
  Sentry.init({
    dsn: config.dsn,
    release: '__VERSION__', // replaced by versionify
  });
}

/**
 * Record the user ID of the logged-in user.
 *
 * See https://docs.sentry.io/platforms/javascript/#capturing-the-user
 *
 * @param {import('@sentry/browser').User|null} user
 */
function setUserInfo(user) {
  Sentry.setUser(user);
}

module.exports = {
  init,
  setUserInfo,
};
