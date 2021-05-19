import { isBrowserExtension } from './is-browser-extension';
import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';
import { urlFromLinkTag } from './url-from-link-tag';

/**
 * @typedef ConfigDefinition
 * @prop {boolean} allowInBrowserExt -
 *  Allow this name to be available in the browser extension. If this is false
 *  and browser extension context is true, use `defaultValue` if provided otherwise
 *  ignore the config key.
 * @prop {any} [defaultValue] - Sets a default if `valueFn` returns undefined.
 * @prop {(configName?: string) => any} valueFn -
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
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.annotations,
    },
    // URL where client assets are served from. Used when injecting the client
    // into child iframes.
    assetRoot: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('assetRoot'),
    },
    branding: {
      defaultValue: null,
      allowInBrowserExt: false,
      valueFn: () => settings.hostPageSetting('branding'),
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
      valueFn: () =>
        settings.hostPageSetting('enableExperimentalNewNoteButton'),
    },
    experimental: {
      allowInBrowserExt: false,
      defaultValue: {},
      valueFn: () => settings.hostPageSetting('experimental'),
    },
    group: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.group,
    },
    focus: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('focus'),
    },
    theme: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('theme'),
    },
    usernameUrl: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('usernameUrl'),
    },
    onLayoutChange: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('onLayoutChange'),
    },
    openSidebar: {
      allowInBrowserExt: true,
      defaultValue: false,
      coerce: toBoolean,
      valueFn: () => settings.hostPageSetting('openSidebar'),
    },
    query: {
      allowInBrowserExt: true,
      defaultValue: null,
      valueFn: () => settings.query,
    },
    requestConfigFromFrame: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('requestConfigFromFrame'),
    },
    services: {
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: () => settings.hostPageSetting('services'),
    },
    showHighlights: {
      allowInBrowserExt: false,
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
      valueFn: () => settings.hostPageSetting('subFrameIdentifier'),
    },
    externalContainerSelector: {
      allowInBrowserExt: false,
      defaultValue: null,
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
    const hasDefault = configDef.defaultValue !== undefined; // A default could be null
    const browserExtensionTrue = isBrowserExtension(
      urlFromLinkTag(window_, 'sidebar', 'html')
    );

    // Only allow certain values to pass through in in the browser extension context
    if (!configDef.allowInBrowserExt && browserExtensionTrue) {
      // If the value is not allowed here, then set to default if provided, otherwise ignore the
      // key:value pair
      if (hasDefault) {
        config[name] = configDef.defaultValue;
      }
      return;
    }

    // Get the value from the configuration source
    const value = configDef.valueFn();
    if (value === undefined) {
      // If there is no value, then set to default if provided, otherwise, ignore the
      // config key:value pair
      if (hasDefault) {
        config[name] = configDef.defaultValue;
      }
      return;
    }

    // Finally, run the value through an optional coerce method
    const coerceFn = configDef.coerce ? configDef.coerce : name => name; // use no-op if omitted
    config[name] = coerceFn(value);
  });

  return config;
}
