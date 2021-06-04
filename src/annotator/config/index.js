import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * @typedef {'sidebar'|'notebook'|'annotator'|'all'} AppContext
 *
 * @typedef ConfigDefinition
 * @prop {() => any} valueFn -
 *   Method to retrieve the value from the incoming source
 */

/**
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
      return [
        ...contexts.annotator,
        ...contexts.sidebar,
        ...contexts.notebook,
        // "experimental" currently has no uses in any app contexts, but is included
        // for test coverage
        'experimental',
      ];
    default:
      throw new Error(`Invalid application context used: "${appContext}"`);
  }
}

/**
 * The definition for configuration sources, their default values
 * @return {ConfigDefinitionMap}
 */
function configDefinitions(settings) {
  return {
    annotations: {
      valueFn: () => settings.annotations,
    },
    appType: {
      valueFn: () =>
        settings.hostPageSetting('appType', {
          allowInBrowserExt: true,
        }),
    },
    branding: {
      valueFn: () => settings.hostPageSetting('branding'),
    },
    // URL of the client's boot script. Used when injecting the client into
    // child iframes.
    clientUrl: {
      valueFn: () => settings.clientUrl,
    },
    enableExperimentalNewNoteButton: {
      valueFn: () =>
        settings.hostPageSetting('enableExperimentalNewNoteButton'),
    },
    experimental: {
      valueFn: () =>
        settings.hostPageSetting('experimental', {
          defaultValue: {},
        }),
    },
    group: {
      valueFn: () => settings.group,
    },
    focus: {
      valueFn: () => settings.hostPageSetting('focus'),
    },
    theme: {
      valueFn: () => settings.hostPageSetting('theme'),
    },
    usernameUrl: {
      valueFn: () => settings.hostPageSetting('usernameUrl'),
    },
    onLayoutChange: {
      valueFn: () => settings.hostPageSetting('onLayoutChange'),
    },
    openSidebar: {
      valueFn: () =>
        settings.hostPageSetting('openSidebar', {
          allowInBrowserExt: true,
          coerce: toBoolean,
        }),
    },
    query: {
      valueFn: () => settings.query,
    },
    requestConfigFromFrame: {
      valueFn: () => settings.hostPageSetting('requestConfigFromFrame'),
    },
    services: {
      valueFn: () => settings.hostPageSetting('services'),
    },
    showHighlights: {
      valueFn: () => settings.showHighlights,
    },
    notebookAppUrl: {
      valueFn: () => settings.notebookAppUrl,
    },
    sidebarAppUrl: {
      valueFn: () => settings.sidebarAppUrl,
    },
    // Sub-frame identifier given when a frame is being embedded into
    // by a top level client
    subFrameIdentifier: {
      valueFn: () =>
        settings.hostPageSetting('subFrameIdentifier', {
          allowInBrowserExt: true,
        }),
    },
    externalContainerSelector: {
      valueFn: () => settings.hostPageSetting('externalContainerSelector'),
    },
  };
}

/**
 * Return the configuration for a given application context.
 *
 * @param {AppContext} [appContext] - The name of the app.
 */
export function getConfig(appContext = 'annotator', window_ = window) {
  const settings = settingsFrom(window_);
  const configDefs = configDefinitions(settings);
  const config = {};
  // Filter the config based on the application context as some config values
  // may be inappropriate or erroneous for some applications.
  let filteredKeys = configurationKeys(appContext);
  filteredKeys.forEach(name => {
    const configDef = configDefs[name];
    // Get the value from the configuration source and run through an optional coerce method
    config[name] = configDef.valueFn();
  });

  return config;
}
