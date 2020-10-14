import * as Sentry from '@sentry/browser';

import warnOnce from '../../shared/warn-once';

/**
 * @typedef SentryConfig
 * @prop {string} dsn
 * @prop {string} environment
 */

let eventsSent = 0;
const maxEventsToSendPerSession = 5;

/**
 * Return the origin which the current script comes from.
 *
 * @return {string|null}
 */
function currentScriptOrigin() {
  try {
    // This property is only available while a `<script>` tag is initially being executed.
    const script = /** @type {HTMLScriptElement} */ (document.currentScript);
    const scriptUrl = new URL(script.src);
    return scriptUrl.origin;
  } catch (e) {
    return null;
  }
}

/**
 * Initialize the Sentry integration.
 *
 * This will activate Sentry and enable capturing of uncaught errors and
 * unhandled promise rejections.
 *
 * @param {SentryConfig} config
 */
export function init(config) {
  // Only send events for errors which can be attributed to our code. This
  // reduces noise in Sentry caused by errors triggered by eg. script tags added
  // by browser extensions. The downside is that this may cause us to miss errors
  // which are caused by our code but, for any reason, cannot be attributed to
  // it. This logic assumes that all of our script bundles are served from
  // the same origin as the bundle which includes this module.
  //
  // If we can't determine the current script's origin, just disable the
  // whitelist and report all errors.
  const scriptOrigin = currentScriptOrigin();
  const whitelistUrls = scriptOrigin ? [scriptOrigin] : undefined;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    // Do not log Fetch failures to avoid inundating with unhandled fetch exceptions
    ignoreErrors: ['Fetch operation failed'],
    release: '__VERSION__', // replaced by versionify
    whitelistUrls,

    // See https://docs.sentry.io/error-reporting/configuration/filtering/?platform=javascript#before-send
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
            // @ts-ignore - `detail` is a property of certain event types.
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
  Sentry.setExtra('document_url', document.referrer);
}

/**
 * Record the user ID of the logged-in user.
 *
 * See https://docs.sentry.io/platforms/javascript/#capturing-the-user
 *
 * @param {import('@sentry/browser').User|null} user
 */
export function setUserInfo(user) {
  Sentry.setUser(user);
}

/**
 * Reset metrics used for client-side event filtering.
 */
export function reset() {
  eventsSent = 0;
}
