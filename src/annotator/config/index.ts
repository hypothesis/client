import { toBoolean } from '../../shared/type-coercions';
import { isBrowserExtension } from './is-browser-extension';
import { settingsFrom } from './settings';
import type { SettingsGetters } from './settings';
import { urlFromLinkTag } from './url-from-link-tag';

type ValueGetter = (settings: SettingsGetters, name: string) => any;

type ConfigDefinition = {
  /** Method to retrieve the value from the incoming source */
  getValue: ValueGetter;

  /**
   * Allow this setting to be read in the browser extension. If this is false
   * and browser extension context is true, use `defaultValue` if provided
   * otherwise ignore the config key
   */
  allowInBrowserExt: boolean;

  /** Sets a default if `getValue` returns undefined */
  defaultValue?: any;
  /** Transform a value's type, value or both */
  coerce?: (value: any) => any;
};

type ConfigDefinitionMap = Record<string, ConfigDefinition>;

/**
 * Named subset of the Hypothesis client configuration that is relevant in
 * a particular context.
 */
type Context = 'sidebar' | 'notebook' | 'profile' | 'annotator' | 'all';

/**
 * Returns the configuration keys that are relevant to a particular context.
 */
function configurationKeys(context: Context): string[] {
  const contexts: Record<Exclude<Context, 'all'>, string[]> = {
    annotator: [
      'clientUrl',
      'contentInfoBanner',
      'contentReady',
      'subFrameIdentifier',
      'sideBySide',
    ],
    sidebar: [
      'appType',
      'annotations',
      'branding',
      'bucketContainerSelector',
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
    profile: ['profileAppUrl'],
  };

  if (context === 'all') {
    // Complete list of configuration keys used for testing.
    return Object.values(contexts).flat();
  }

  return contexts[context];
}

const getHostPageSetting: ValueGetter = (settings, name) =>
  settings.hostPageSetting(name);

/**
 * Definitions of configuration keys
 */
const configDefinitions: ConfigDefinitionMap = {
  annotations: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.annotations,
  },
  appType: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  branding: {
    defaultValue: null,
    allowInBrowserExt: false,
    getValue: getHostPageSetting,
  },
  bucketContainerSelector: {
    defaultValue: null,
    allowInBrowserExt: false,
    getValue: getHostPageSetting,
  },
  // URL of the client's boot script. Used when injecting the client into
  // child iframes.
  clientUrl: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.clientUrl,
  },
  contentInfoBanner: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  contentReady: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  enableExperimentalNewNoteButton: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  group: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.group,
  },
  focus: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  theme: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  usernameUrl: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  onLayoutChange: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  openSidebar: {
    allowInBrowserExt: true,
    defaultValue: false,
    coerce: toBoolean,
    getValue: getHostPageSetting,
  },
  query: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.query,
  },
  requestConfigFromFrame: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  services: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  showHighlights: {
    allowInBrowserExt: false,
    defaultValue: 'always',
    getValue: settings => settings.showHighlights,
  },
  notebookAppUrl: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.notebookAppUrl,
  },
  profileAppUrl: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.profileAppUrl,
  },
  sidebarAppUrl: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: settings => settings.sidebarAppUrl,
  },
  // Sub-frame identifier given when a frame is being embedded into
  // by a top level client
  subFrameIdentifier: {
    allowInBrowserExt: true,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  externalContainerSelector: {
    allowInBrowserExt: false,
    defaultValue: null,
    getValue: getHostPageSetting,
  },
  sideBySide: {
    allowInBrowserExt: true,
    getValue: settings => settings.sideBySide,
  },
};

/**
 * Return the subset of Hypothesis client configuration that is relevant in
 * a particular context.
 *
 * See https://h.readthedocs.io/projects/client/en/latest/publishers/config/
 * for details of all available configuration and the different ways they
 * can be included on the page. In addition to the configuration provided by
 * the embedder, the boot script also passes some additional configuration
 * to the annotator, such as URLs of the various sub-applications and the
 * boot script itself.
 */
export function getConfig(context: Context, window_: Window = window) {
  const settings = settingsFrom(window_);
  const config: Record<string, unknown> = {};

  // Filter the config based on the application context as some config values
  // may be inappropriate or erroneous for some applications.
  for (const key of configurationKeys(context)) {
    const configDef = configDefinitions[key];
    const hasDefault = configDef.defaultValue !== undefined; // A default could be null
    const isURLFromBrowserExtension = isBrowserExtension(
      urlFromLinkTag(window_, 'sidebar', 'html')
    );

    // Only allow certain values in the browser extension context
    if (!configDef.allowInBrowserExt && isURLFromBrowserExtension) {
      // If the value is not allowed here, then set to the default if provided, otherwise ignore
      // the key:value pair
      if (hasDefault) {
        config[key] = configDef.defaultValue;
      }
      continue;
    }

    // Get the value from the configuration source
    const value = configDef.getValue(settings, key);
    if (value === undefined) {
      // If there is no value (e.g. undefined), then set to the default if provided,
      // otherwise ignore the config key:value pair
      if (hasDefault) {
        config[key] = configDef.defaultValue;
      }
      continue;
    }

    // Finally, run the value through an optional coerce method
    config[key] = configDef.coerce ? configDef.coerce(value) : value;
  }

  return config;
}
