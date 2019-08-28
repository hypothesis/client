'use strict';

const Sentry = require('@sentry/browser');

const warnOnce = require('../../shared/warn-once');

/**
 * @typedef SentryConfig
 * @prop {string} dsn
 * @prop {string} environment
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
    environment: config.environment,
    release: '__VERSION__', // replaced by versionify

    beforeSend: (event, hint) => {
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

      // Add additional debugging information for non-Error exception types
      // which Sentry can't serialize to a useful format automatically.
      //
      // See https://github.com/getsentry/sentry-javascript/issues/2210
      try {
        const originalErr = hint && hint.originalException;
        if (originalErr instanceof Event) {
          Object.assign(event.extra, {
            type: originalErr.type,
            detail: originalErr.detail,
            isTrusted: originalErr.isTrusted,
          });
        }
      } catch (e) {
        // If something went wrong serializing the data, just ignore it.
      }

      return event;
    },
  });

  // In the sidebar application, it is often useful to know the URL which the
  // client was loaded into. This information is usually available in an iframe
  // via `document.referrer`. More information about the document is available
  // later when frames where the "annotator" code has loaded have connected to
  // the sidebar via `postMessage` RPC messages.
  Sentry.setTag('document_url', document.referrer);
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
