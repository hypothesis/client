/**
 * Create the JSON-serializable subset of annotator configuration that should
 * be passed to the sidebar or notebook applications.
 *
 * @param {string} appURL - URL from which the application will be served
 * @param {Record<string, unknown>} config
 * @return {Record<string, unknown>}
 */
export function createAppConfig(appURL, config) {
  /** @type {Record<string, unknown>} */
  const appConfig = {};

  for (let [key, value] of Object.entries(config)) {
    // Remove several annotator-only properties.
    //
    // nb. We don't currently strip all the annotator-only properties here.
    // That's OK because validation / filtering happens in the sidebar app itself.
    // It just results in unnecessary content in the sidebar iframe's URL string.
    if (key === 'notebookAppUrl' || key === 'sidebarAppUrl') {
      continue;
    }

    // Strip nullish properties, as these are ignored by the application and
    // they add noise to logs etc.
    //
    // eslint-disable-next-line eqeqeq
    if (value == null) {
      continue;
    }

    appConfig[key] = value;
  }

  // Pass the expected origin of the app. This is used to detect when it is
  // served from a different location than expected, which may stop it working.
  appConfig.origin = new URL(appURL).origin;

  // Pass the version of the client, so we can check if it is the same as the
  // one used in the sidebar/notebook.
  appConfig.version = '__VERSION__';

  // Pass the URL of the page that embedded the client.
  const hostURL = new URL(window.location.href);
  hostURL.hash = '';
  appConfig.hostURL = hostURL.toString();

  // Some config settings are not JSON-stringifiable (e.g. JavaScript
  // functions) and will be omitted when the config is JSON-stringified.
  // Add a JSON-stringifiable option for each of these so that the sidebar can
  // at least know whether the callback functions were provided or not.
  if (Array.isArray(appConfig.services) && appConfig.services?.length > 0) {
    const service = appConfig.services[0];
    if (service.onLoginRequest) {
      service.onLoginRequestProvided = true;
    }
    if (service.onLogoutRequest) {
      service.onLogoutRequestProvided = true;
    }
    if (service.onSignupRequest) {
      service.onSignupRequestProvided = true;
    }
    if (service.onProfileRequest) {
      service.onProfileRequestProvided = true;
    }
    if (service.onHelpRequest) {
      service.onHelpRequestProvided = true;
    }
  }

  return appConfig;
}
