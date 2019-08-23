'use strict';

const Sentry = require('@sentry/browser');

const warnOnce = require('../../shared/warn-once');

/**
 * @typedef SentryConfig
 * @prop {string} dsn
 */

let eventsSent = 0;
const maxEventsToSendPerSession = 5;

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

    beforeSend: event => {
      if (eventsSent >= maxEventsToSendPerSession) {
        // Cap the number of events that any client instance will send, to
        // reduce the impact on our Sentry event quotas.
        //
        // Sentry implements its own server-side rate limiting in addition.
        // See https://docs.sentry.io/accounts/quotas/.
        warnOnce(
          'Client-side Sentry quota reached. No further Sentry events will be sent'
        );
        return null;
      }

      ++eventsSent;
      return event;
    },
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

/**
 * Reset metrics used for client-side event filtering.
 */
function reset() {
  eventsSent = 0;
}

module.exports = {
  init,
  setUserInfo,

  // Test helpers.
  reset,
};
