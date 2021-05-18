import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * @typedef ConfigDefinition
 * @prop {() => any} valueFn -
 *   Method to retrieve the value from the incoming source
 * @prop {(value: any) => any} [coerce] - Transform a value's type, value or both
 */

/**
 * @typedef {Record<string, ConfigDefinition>} ConfigDefinitionMap
 */

/**
 * List of allowed configuration keys per application context. Keys omitted
 * in a given context will be removed from the relative configs when calling
 * getConfig.
 *
 * @param {'sidebar'|'notebook'|'annotator'|'all'} [appContext] - The name of the app.
 */
function configurationContexts(appContext) {
  switch (appContext) {
    case 'annotator':
      return ['clientUrl', 'showHighlights', 'subFrameIdentifier'];
    case 'sidebar':
      return [
        'annotations',
        'branding',
        'enableExperimentalNewNoteButton',
        'externalContainerSelector',
        'focus',
        'group',
        'onLayoutChange',
        'openSidebar',
        'requestConfigFromFrame',
        'services',
        'showHighlights',
        'sidebarAppUrl',
        'theme',
        'usernameUrl',
      ];
    case 'notebook':
      return [
        'branding',
        'enableExperimentalNewNoteButton',
        'focus',
        'group',
        'notebookAppUrl',
        'requestConfigFromFrame',
        'services',
        'showHighlights',
        'theme',
        'usernameUrl',
      ];
    case 'all':
    default:
      // Complete list of configuration keys used for testing.
      return [
        'annotations',
        'assetRoot',
        'branding',
        'clientUrl',
        'enableExperimentalNewNoteButton',
        'experimental',
        'externalContainerSelector',
        'group',
        'focus',
        'notebookAppUrl',
        'onLayoutChange',
        'openSidebar',
        'query',
        'requestConfigFromFrame',
        'services',
        'showHighlights',
        'sidebarAppUrl',
        'subFrameIdentifier',
        'theme',
        'usernameUrl',
      ];
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
    // URL where client assets are served from. Used when injecting the client
    // into child iframes.
    assetRoot: {
      valueFn: () =>
        settings.hostPageSetting('assetRoot', {
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
      coerce: toBoolean,
      valueFn: () =>
        settings.hostPageSetting('openSidebar', {
          allowInBrowserExt: true,
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
 * @param {'sidebar'|'notebook'|'annotator'|'all'} [appContext] - The name of the app.
 */
export function getConfig(appContext = 'annotator', window_ = window) {
  const settings = settingsFrom(window_);
  const configDefs = configDefinitions(settings);
  const config = {};
  // Filter the config based on the application context as some config values
  // may be inappropriate or erroneous for some applications.
  let filteredKeys = configurationContexts(appContext);
  filteredKeys.forEach(name => {
    const configDef = configDefs[name];
    const coerceFn = configDef.coerce ? configDef.coerce : name => name; // use no-op if omitted
    // Get the value from the configuration source and run through an optional coerce method
    config[name] = coerceFn(configDef.valueFn());
  });

  return config;
}
