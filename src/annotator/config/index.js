import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * @typedef {'sidebar'|'notebook'|'annotator'|'all'} AppContext
 */

/**
 * List of allowed configuration keys per application context. Keys omitted
 * in a given context will be removed from the relative configs when calling
 * getConfig.
 *
 * @param {AppContext} [appContext] - The name of the app.
 */
function configurationKeys(appContext) {
  const contexts = {
    annotator: ['clientUrl', 'showHighlights', 'subFrameIdentifier'],
    sidebar: [
      'appType',
      'annotations',
      'branding',
      'enableExperimentalNewNoteButton',
      'externalContainerSelector',
      'focus',
      'group',
      'onLayoutChange',
      'openSidebar',
      'query',
      'requestConfigFromFrame',
      'services',
      'showHighlights',
      'sidebarAppUrl',
      'theme',
      'usernameUrl',
    ],
    notebook: [
      'branding',
      'group',
      'notebookAppUrl',
      'requestConfigFromFrame',
      'services',
      'theme',
      'usernameUrl',
    ],
  };

  switch (appContext) {
    case 'annotator':
      return contexts.annotator;
    case 'sidebar':
      return contexts.sidebar;
    case 'notebook':
      return contexts.notebook;
    case 'all':
      // Complete list of configuration keys used for testing.
      return [...contexts.annotator, ...contexts.sidebar, ...contexts.notebook];
    default:
      throw new Error(`Invalid application context used: "${appContext}"`);
  }
}

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {string[]} settingsKeys - List of settings that should be returned.
 * @param {Window} window_ - The Window object to read config from.
 */
function configFrom(settingsKeys, window_) {
  const settings = settingsFrom(window_);
  const allConfigSettings = {
    annotations: settings.annotations,
    appType: settings.hostPageSetting('appType', {
      allowInBrowserExt: true,
    }),
    branding: settings.hostPageSetting('branding'),
    // URL of the client's boot script. Used when injecting the client into
    // child iframes.
    clientUrl: settings.clientUrl,
    enableExperimentalNewNoteButton: settings.hostPageSetting(
      'enableExperimentalNewNoteButton'
    ),
    experimental: settings.hostPageSetting('experimental', {
      defaultValue: {},
    }),
    group: settings.group,
    focus: settings.hostPageSetting('focus'),
    theme: settings.hostPageSetting('theme'),
    usernameUrl: settings.hostPageSetting('usernameUrl'),
    onLayoutChange: settings.hostPageSetting('onLayoutChange'),
    openSidebar: settings.hostPageSetting('openSidebar', {
      allowInBrowserExt: true,
      // Coerce value to a boolean because it may come from via as a string
      coerce: toBoolean,
    }),
    query: settings.query,
    requestConfigFromFrame: settings.hostPageSetting('requestConfigFromFrame'),
    services: settings.hostPageSetting('services'),
    showHighlights: settings.showHighlights,
    notebookAppUrl: settings.notebookAppUrl,
    sidebarAppUrl: settings.sidebarAppUrl,
    // Subframe identifier given when a frame is being embedded into
    // by a top level client
    subFrameIdentifier: settings.hostPageSetting('subFrameIdentifier', {
      allowInBrowserExt: true,
    }),
    externalContainerSelector: settings.hostPageSetting(
      'externalContainerSelector'
    ),
  };

  // Only return what we asked for
  const resultConfig = {};
  settingsKeys.forEach(key => {
    resultConfig[key] = allConfigSettings[key];
  });
  return resultConfig;
}

/**
 * Return the configuration for a given application context.
 *
 * @param {AppContext} [appContext] - The name of the app.
 */
export function getConfig(appContext = 'annotator', window_ = window) {
  // Filter the config based on the application context as some config values
  // may be inappropriate or erroneous for some applications.
  const filteredKeys = configurationKeys(appContext);
  const config = configFrom(filteredKeys, window_);
  return config;
}
