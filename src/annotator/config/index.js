import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * @typedef {'sidebar'|'notebook'|'annotator'|'all'} AppContext
 *
 * @typedef {import('./settings').SettingsGetters} SettingsGetters
 *
 * @typedef ConfigDefinition
 * @prop {(settings: SettingsGetters) => any} getValue -
 *   Method to retrieve the value from the incoming source
 *
 * @typedef {Record<string, ConfigDefinition>} ConfigDefinitionMap
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
 * Definitions of configuration keys
 * @type {ConfigDefinitionMap}
 */
const configDefinitions = {
  annotations: {
    getValue: settings => settings.annotations,
  },
  appType: {
    getValue: settings =>
      settings.hostPageSetting('appType', {
        allowInBrowserExt: true,
      }),
  },
  branding: {
    getValue: settings => settings.hostPageSetting('branding'),
  },
  // URL of the client's boot script. Used when injecting the client into
  // child iframes.
  clientUrl: {
    getValue: settings => settings.clientUrl,
  },
  enableExperimentalNewNoteButton: {
    getValue: settings =>
      settings.hostPageSetting('enableExperimentalNewNoteButton'),
  },
  group: {
    getValue: settings => settings.group,
  },
  focus: {
    getValue: settings => settings.hostPageSetting('focus'),
  },
  theme: {
    getValue: settings => settings.hostPageSetting('theme'),
  },
  usernameUrl: {
    getValue: settings => settings.hostPageSetting('usernameUrl'),
  },
  onLayoutChange: {
    getValue: settings => settings.hostPageSetting('onLayoutChange'),
  },
  openSidebar: {
    getValue: settings =>
      settings.hostPageSetting('openSidebar', {
        allowInBrowserExt: true,
        coerce: toBoolean,
      }),
  },
  query: {
    getValue: settings => settings.query,
  },
  requestConfigFromFrame: {
    getValue: settings => settings.hostPageSetting('requestConfigFromFrame'),
  },
  services: {
    getValue: settings => settings.hostPageSetting('services'),
  },
  showHighlights: {
    getValue: settings => settings.showHighlights,
  },
  notebookAppUrl: {
    getValue: settings => settings.notebookAppUrl,
  },
  sidebarAppUrl: {
    getValue: settings => settings.sidebarAppUrl,
  },
  // Sub-frame identifier given when a frame is being embedded into
  // by a top level client
  subFrameIdentifier: {
    getValue: settings =>
      settings.hostPageSetting('subFrameIdentifier', {
        allowInBrowserExt: true,
      }),
  },
  externalContainerSelector: {
    getValue: settings => settings.hostPageSetting('externalContainerSelector'),
  },
};

/**
 * Return the configuration for a given application context.
 *
 * @param {AppContext} [appContext] - The name of the app.
 */
export function getConfig(appContext = 'annotator', window_ = window) {
  const settings = settingsFrom(window_);
  const config = {};
  // Filter the config based on the application context as some config values
  // may be inappropriate or erroneous for some applications.
  let filteredKeys = configurationKeys(appContext);
  filteredKeys.forEach(name => {
    const configDef = configDefinitions[name];
    // Get the value from the configuration source
    config[name] = configDef.getValue(settings);
  });

  return config;
}
