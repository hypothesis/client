import settingsFrom from './settings';
import { toBoolean } from '../../shared/type-coercions';

/**
 * Reads the Hypothesis configuration from the environment.
 *
 * @param {Window} window_ - The Window object to read config from.
 */
export default function configFrom(window_) {
  const settings = settingsFrom(window_);
  return {
    annotations: settings.annotations,
    // URL where client assets are served from. Used when injecting the client
    // into child iframes.
    assetRoot: settings.hostPageSetting('assetRoot', {
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
}
