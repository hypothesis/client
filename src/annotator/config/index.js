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
 * @typedef ConfigDefinitionMap
 * @prop {ConfigDefinition} [annotations]
 * @prop {ConfigDefinition} [assetRoot]
 * @prop {ConfigDefinition} [branding]
 * @prop {ConfigDefinition} [clientUrl]
 * @prop {ConfigDefinition} [enableExperimentalNewNoteButton]
 * @prop {ConfigDefinition} [experimental]
 * @prop {ConfigDefinition} [group]
 * @prop {ConfigDefinition} [focus]
 * @prop {ConfigDefinition} [theme]
 * @prop {ConfigDefinition} [usernameUrl]
 * @prop {ConfigDefinition} [onLayoutChange]
 * @prop {ConfigDefinition} [openSidebar]
 * @prop {ConfigDefinition} [query]
 * @prop {ConfigDefinition} [requestConfigFromFrame]
 * @prop {ConfigDefinition} [services]
 * @prop {ConfigDefinition} [showHighlights]
 * @prop {ConfigDefinition} [notebookAppUrl]
 * @prop {ConfigDefinition} [sidebarAppUrl]
 * @prop {ConfigDefinition} [subFrameIdentifier]
 * @prop {ConfigDefinition} [externalContainerSelector]
 */

/**
 * Reads the Hypothesis configuration from the environment.
 */
export default class Config {
  /**
   * @param {Window} window_ - The Window object to read config from.
   */
  constructor(window_) {
    this.settings = settingsFrom(window_);
    this.isBrowserExtension = this.settings.isBrowserExtension;
  }

  /**
   * The definition for configuration sources, their default values
   * @return {ConfigDefinitionMap}
   */
  configDefinitions() {
    return {
      annotations: {
        defaultValue: null,
        allowInBrowserExt: true,
        valueFn: () => this.settings.annotations,
      },
      // URL where client assets are served from. Used when injecting the client
      // into child iframes.
      assetRoot: {
        defaultValue: null,
        allowInBrowserExt: true,
        valueFn: this.settings.hostPageSetting,
      },
      branding: {
        defaultValue: null,
        allowInBrowserExt: false,
        valueFn: this.settings.hostPageSetting,
      },
      // URL of the client's boot script. Used when injecting the client into
      // child iframes.
      clientUrl: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: () => this.settings.clientUrl,
      },
      enableExperimentalNewNoteButton: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      experimental: {
        allowInBrowserExt: false,
        defaultValue: {},
        valueFn: this.settings.hostPageSetting,
      },
      group: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: () => this.settings.group,
      },
      focus: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      theme: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      usernameUrl: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      onLayoutChange: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      openSidebar: {
        allowInBrowserExt: true,
        defaultValue: false,
        coerce: toBoolean,
        valueFn: this.settings.hostPageSetting,
      },
      query: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: () => this.settings.query,
      },
      requestConfigFromFrame: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      services: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      showHighlights: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: () => this.settings.showHighlights,
      },
      notebookAppUrl: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: () => this.settings.notebookAppUrl,
      },
      sidebarAppUrl: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: () => this.settings.sidebarAppUrl,
      },
      // Sub-frame identifier given when a frame is being embedded into
      // by a top level client
      subFrameIdentifier: {
        allowInBrowserExt: true,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
      externalContainerSelector: {
        allowInBrowserExt: false,
        defaultValue: null,
        valueFn: this.settings.hostPageSetting,
      },
    };
  }

  annotatorDefinitions() {
    return this.configDefinitions();
  }

  sidebarDefinitions() {
    return this.configDefinitions();
  }

  notebookDefinitions() {
    const config = this.configDefinitions();
    // Don't pass `annotations` setting to notebook.
    delete config.annotations;
    return config;
  }

  /**
   * Process the config definition to create the final config value.
   *   - find the value from its source (valueFn)
   *   - filter allowInBrowserExt as needed
   *   - coerce the value if necessary
   *   - set a default if the value is undefined
   * @param {string} name - Config key name
   * @param {ConfigDefinition} configDef
   */
  createValueFromDefinition(name, configDef) {
    // If allowInBrowserExt is false and this is the browser extension context, skip value
    if (!configDef.allowInBrowserExt && this.isBrowserExtension) {
      return undefined;
    }

    const coerceFn = configDef.coerce ? configDef.coerce : name => name; // use no-op if omitted
    // Get the value from the configuration source and run through an optional coerce method
    const value = coerceFn(configDef.valueFn.call(this, name));

    // If a defaultValue is provided and the value is undefined, set the default
    if (value === undefined && configDef.defaultValue !== undefined) {
      return configDef.defaultValue;
    } else {
      return value;
    }
  }

  /**
   * Return the configuration for a given application context
   *
   * @param {'sidebar'|'notebook'|'annotator'} [appContext] -
   *   The name of the app. Omit this param to return the total configuration
   */
  getConfig(appContext = 'annotator') {
    const config = {};

    // Filter the config based on the application context as some config values
    // may be inappropriate or erroneous for some applications.
    let partialConfigDef = {};
    switch (appContext) {
      case 'annotator':
        partialConfigDef = this.annotatorDefinitions();
        break;
      case 'sidebar':
        partialConfigDef = this.sidebarDefinitions();
        break;
      case 'notebook':
        partialConfigDef = this.notebookDefinitions();
        break;
    }

    for (const [name, configDef] of Object.entries(partialConfigDef)) {
      const value = this.createValueFromDefinition(name, configDef);
      // Only pass the value if its not undefined
      if (value !== undefined) {
        config[name] = value;
      }
    }
    return config;
  }
}
