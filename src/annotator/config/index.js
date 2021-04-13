import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * @typedef ConfigDefinition
 * @prop {boolean} allowInBrowserExt - Allow this name to be available in the browser extension
 * @prop {any} [defaultValue] - Sets a default if `valueFn` returns undefined
 * @prop {([configName]: string) => any} valueFn -
 *   Method to retrieve the value from the incoming source
 * @prop {(value: any) => any} [coerce] - Transform a value's type value or value
 */

/**
 * @typedef {Record<string, ConfigDefinition>} ConfigDefinitionMap
 */

/**
 * Total list of configuration keys.
 */
const configurationKeys = [
  'annotations',
  'assetRoot',
  'branding',
  'clientUrl',
  'enableExperimentalNewNoteButton',
  'experimental',
  'group',
  'focus',
  'theme',
  'usernameUrl',
  'onLayoutChange',
  'openSidebar',
  'query',
  'requestConfigFromFrame',
  'services',
  'showHighlights',
  'notebookAppUrl',
  'sidebarAppUrl',
  'subFrameIdentifier',
  'externalContainerSelector',
];

/**
 * List of allowed configuration keys per application context. Keys omitted
 * in a given context will be removed from the relative configs when calling
 * getConfig.
 */
const configurationContexts = {
  // For testing
  all: [...configurationKeys],

  annotator: [...configurationKeys],

  sidebar: [...configurationKeys],

  // Notebook must omit the `annotations` setting
  notebook: configurationKeys.filter(
    configProperty => configProperty !== 'annotations'
  ),
};

/**
 * The definition for configuration sources, their default values
 * @return {ConfigDefinitionMap}
 */
function configDefinitions(settings) {
  return {
    annotations: {
      defaultValue: null,
      allowInBrowserExt: true,
      valueFn: () => settings.annotations,
    },
    // URL where client assets are served from. Used when injecting the client
    // into child iframes.
    assetRoot: {
      defaultValue: null,
      allowInBrowserExt: true,
      valueFn: settings.hostPageSetting,
    },
    branding: {
      defaultValue: null,
      allowInBrowserExt: false,
      valueFn: settings.hostPageSetting,
    },
    // URL of the client's boot script. Used when injecting the client into
    // child iframes.
    clientUrl: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.clientUrl,
    },
    enableExperimentalNewNoteButton: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    experimental: {
      allowInBrowserExt: false,
      defaultValue: {},
      valueFn: settings.hostPageSetting,
    },
    group: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.group,
    },
    focus: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    theme: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    usernameUrl: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    onLayoutChange: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    openSidebar: {
      allowInBrowserExt: true,
      defaultValue: false,
      coerce: toBoolean,
      valueFn: settings.hostPageSetting,
    },
    query: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.query,
    },
    requestConfigFromFrame: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    services: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    showHighlights: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.showHighlights,
    },
    notebookAppUrl: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.notebookAppUrl,
    },
    sidebarAppUrl: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.sidebarAppUrl,
    },
    // Sub-frame identifier given when a frame is being embedded into
    // by a top level client
    subFrameIdentifier: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
    externalContainerSelector: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
    },
  };
}

/**
 * Return the configuration for a given application context.
 *
 * @param {'sidebar'|'notebook'|'annotator'|'all'} [appContext] - The name of the app.
 */
export default function getConfig(appContext = 'annotator', window_ = window) {
  const config = {};

  // Filter the config based on the application context as some config values
  // may be inappropriate or erroneous for some applications.
  let partialConfigDef = {};
  const settings = settingsFrom(window_);
  const configDefs = configDefinitions(settings);

  // One of 'annotator', 'sidebar', or 'notebook' or 'all'
  let filteredKeys = configurationContexts[appContext];
  filteredKeys.forEach(key => {
    partialConfigDef[key] = configDefs[key];
  });

  for (const [name, configDef] of Object.entries(partialConfigDef)) {
    // If allowInBrowserExt is false and this is the browser extension context, skip value
    if (!configDef.allowInBrowserExt && settings.isBrowserExtension) {
      continue;
    }

    const coerceFn = configDef.coerce ? configDef.coerce : name => name; // use no-op if omitted
    // Get the value from the configuration source and run through an optional coerce method
    let value = coerceFn(configDef.valueFn(name));

    // If a defaultValue is provided and the value is undefined, set the default
    if (value === undefined && configDef.defaultValue !== undefined) {
      value = configDef.defaultValue;
    }

    // Only pass the value if its not undefined
    if (value !== undefined) {
      config[name] = value;
    }
  }
  return config;
}
