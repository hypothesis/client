import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * @typedef ConfigDefinition
 * @prop {Array<string>} namespaces - Namespaces that this name is valid in
 * @prop {boolean} allowInBrowserExt - Allow this name to be available in the browser extension
 * @prop {any} [defaultValue] - Sets a default if `valueFn` returns undefined
 * @prop {([configName]: string) => any} valueFn -
 *   Method to retrieve the value from the incoming source
 * @prop {(value: any) => any} coerce - Transform a value's type value or value
 */

/**
 * @typedef ConfigDefinitionMap
 * @prop {ConfigDefinition} annotations
 * @prop {ConfigDefinition} assetRoot
 * @prop {ConfigDefinition} branding
 * @prop {ConfigDefinition} clientUrl
 * @prop {ConfigDefinition} enableExperimentalNewNoteButton
 * @prop {ConfigDefinition} experimental
 * @prop {ConfigDefinition} group
 * @prop {ConfigDefinition} focus
 * @prop {ConfigDefinition} theme
 * @prop {ConfigDefinition} usernameUrl
 * @prop {ConfigDefinition} onLayoutChange
 * @prop {ConfigDefinition} openSidebar
 * @prop {ConfigDefinition} query
 * @prop {ConfigDefinition} requestConfigFromFrame
 * @prop {ConfigDefinition} services
 * @prop {ConfigDefinition} showHighlights
 * @prop {ConfigDefinition} notebookAppUrl
 * @prop {ConfigDefinition} sidebarAppUrl
 * @prop {ConfigDefinition} subFrameIdentifier
 * @prop {ConfigDefinition} externalContainerSelector
 */

/**
 * Reads the Hypothesis configuration from the environment.
 */
export default class Config {
  /**
   * @param {Window} window_ - The Window object to read config from.
   */
  constructor(window_) {
    const settings = settingsFrom(window_);
    this.isBrowserExtension = settings.isBrowserExtension;

    // Base (default) config definition
    const defaults = {
      namespaces: ['annotator', 'sidebar', 'notebook'],
      allowInBrowserExt: false,
      defaultValue: null,
      valueFn: settings.hostPageSetting,
      coerce: name => name, //no-op.
    };

    // The definition for configuration sources, their default values and app limitations.
    /** @type {ConfigDefinitionMap} */
    this.configDefinitions = {
      annotations: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.annotations,
      },
      // URL where client assets are served from. Used when injecting the client
      // into child iframes.
      assetRoot: {
        ...defaults,
        allowInBrowserExt: true,
      },
      branding: { ...defaults },
      // URL of the client's boot script. Used when injecting the client into
      // child iframes.
      clientUrl: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.clientUrl,
      },
      enableExperimentalNewNoteButton: { ...defaults },
      experimental: {
        ...defaults,
        defaultValue: {},
      },
      group: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.group,
      },
      focus: { ...defaults },
      theme: { ...defaults },
      usernameUrl: { ...defaults },
      onLayoutChange: { ...defaults },
      openSidebar: {
        ...defaults,
        allowInBrowserExt: true,
        coerce: toBoolean,
      },
      query: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.query,
      },
      requestConfigFromFrame: { ...defaults },
      services: { ...defaults },
      showHighlights: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.showHighlights,
      },
      notebookAppUrl: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.notebookAppUrl,
      },
      sidebarAppUrl: {
        ...defaults,
        allowInBrowserExt: true,
        valueFn: () => settings.sidebarAppUrl,
      },
      // Sub-frame identifier given when a frame is being embedded into
      // by a top level client
      subFrameIdentifier: {
        ...defaults,
        allowInBrowserExt: true,
      },
      externalContainerSelector: { ...defaults },
    };
  }

  /**
   * Return the configuration.
   *
   * @param {'sidebar'|'notebook'|'annotator'|null} [namespace] -
   *   The name of the app. Omit this param to return the total configuration
   */
  get(namespace = null) {
    const partialConfig = {};
    for (const [key, configDefs] of Object.entries(this.configDefinitions)) {
      // If namespace is requested, skip any values not belonging to the namespace
      if (namespace && !configDefs.namespaces.includes(namespace)) {
        continue;
      }

      // If allowInBrowserExt is false and this is the browser extension context, skip value
      if (!configDefs.allowInBrowserExt && this.isBrowserExtension) {
        continue;
      }

      // Get the value from the configuration source and run through a coerce method. Note
      // the default coerce method is a no-op.
      const value = configDefs.coerce(configDefs.valueFn.call(this, key));

      // If a defaultValue is provided and the value is undefined, set the default
      if (value === undefined && configDefs.defaultValue !== undefined) {
        partialConfig[key] = configDefs.defaultValue;
      } else {
        partialConfig[key] = value;
      }
    }
    return partialConfig;
  }
}
