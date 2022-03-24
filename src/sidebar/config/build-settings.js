import { getApiUrl } from './get-api-url';
import { hostPageConfig } from './host-config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @typedef {import('../../types/config').ConfigFromHost} ConfigFromHost
 * @typedef {import('../../types/config').ConfigFromSidebar} ConfigFromSidebar
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * Returns the global embedder ancestor frame.
 *
 * @param {number} levels - Number of ancestors levels to ascend.
 * @param {Window=} window_
 * @return {Window}
 */
function getAncestorFrame(levels, window_ = window) {
  let ancestorWindow = window_;
  for (let i = 0; i < levels; i++) {
    if (ancestorWindow === ancestorWindow.top) {
      throw new Error(
        'The target parent frame has exceeded the ancestor tree. Try reducing the `requestConfigFromFrame.ancestorLevel` value in the `hypothesisConfig`'
      );
    }
    ancestorWindow = ancestorWindow.parent;
  }
  return ancestorWindow;
}

/**
 * Merge client configuration from h service with config from the hash fragment.
 *
 * @param {ConfigFromSidebar} appConfig - App config settings rendered into `app.html` by the h service.
 * @param {ConfigFromHost} hostPageConfig - App configuration specified by the embedding frame.
 * @return {SidebarSettings} - The merged settings.
 */
function fetchConfigEmbed(appConfig, hostPageConfig) {
  const sidebarSettings = {
    ...appConfig,
    ...hostPageConfig,
  };
  sidebarSettings.apiUrl = getApiUrl(sidebarSettings);
  return sidebarSettings;
}

/**
 * Merge client configuration from h service with config fetched from
 * a parent frame asynchronously.
 *
 * Use this method to retrieve the config asynchronously from a parent
 * frame via RPC. See tests for more details.
 *
 * @param {ConfigFromSidebar} appConfig - Settings rendered into `app.html` by the h service.
 * @param {Window} parentFrame - Frame to send call to.
 * @param {string} origin - Origin filter for `window.postMessage` call.
 * @return {Promise<SidebarSettings>} - The merged settings.
 */
async function fetchConfigRpc(appConfig, parentFrame, origin) {
  const remoteConfig = await postMessageJsonRpc.call(
    parentFrame,
    origin,
    'requestConfig',
    [],
    3000
  );
  /**
   * @param {string} method
   * @param {any[]} args
   */
  const rpcCall = (method, args = [], timeout = 3000) =>
    postMessageJsonRpc.call(parentFrame, origin, method, args, timeout);
  const sidebarSettings = fetchConfigEmbed(appConfig, remoteConfig);
  return fetchGroupsAsync(sidebarSettings, rpcCall);
}

/**
 * Potentially mutates the `groups` config object(s) to be a promise that
 * resolves right away if the `groups` value exists in the original
 * config, or returns a promise that resolves with a secondary RPC
 * call to `requestGroups` when the `groups` value is '$rpc:requestGroups'
 * If the `groups` value is missing or falsely then it won't be mutated.
 *
 * This allows the app to start with an incomplete config and then lazily
 * fill in the `groups` value(s) later when its ready. This helps speed
 * up the loading process.
 *
 * @param {SidebarSettings} config - The configuration object to mutate. This should
 *  already have the `services` value
 * @param {function} rpcCall - RPC method
 *  (method, args, timeout) => Promise
 * @return {Promise<SidebarSettings>} - The mutated settings
 */
async function fetchGroupsAsync(config, rpcCall) {
  if (Array.isArray(config.services)) {
    config.services.forEach((service, index) => {
      if (service.groups === '$rpc:requestGroups') {
        // The `groups` need to be fetched from a secondary RPC call and
        // there should be no timeout as it may be waiting for user input.
        service.groups = rpcCall('requestGroups', [index], null).catch(() => {
          throw new Error('Unable to fetch groups');
        });
      }
    });
  }
  return config;
}

/**
 * Build a `SidebarSettings` object by merging the provided `ConfigFromSidebar`
 * with `ConfigFromHost` from an appropriate source.
 *
 * `ConfigFromHost` may come from either:
 *  - The URL hash of the iframe, written by the annotator when creating the
 *    sidebar's iframe, OR
 *  - By sending an RPC request for host configuration to a known ancestor frame
 *
 * @param {ConfigFromSidebar} appConfig
 * @param {Window} window_ - Test seam.
 * @return {Promise<SidebarSettings>} - The merged settings.
 */
export async function buildSettings(appConfig, window_ = window) {
  const hostConfig = hostPageConfig(window);

  const requestConfigFromFrame = hostConfig.requestConfigFromFrame;

  if (!requestConfigFromFrame) {
    // Directly embed: just get the config.
    return fetchConfigEmbed(appConfig, hostConfig);
  }
  if (
    typeof requestConfigFromFrame.ancestorLevel === 'number' &&
    typeof requestConfigFromFrame.origin === 'string'
  ) {
    // Know parent frame: send RPC directly to the parent.
    const parentFrame = getAncestorFrame(
      requestConfigFromFrame.ancestorLevel,
      window_
    );

    const rpcSidebarSettings = await fetchConfigRpc(
      appConfig,
      parentFrame,
      requestConfigFromFrame.origin
    );
    // Add back the optional focused group id from the host page config
    // as this is needed in the Notebook.
    return {
      ...rpcSidebarSettings,
      ...(hostConfig.group ? { group: hostConfig.group } : {}),
    };
  } else {
    throw new Error(
      'Improper `requestConfigFromFrame` object. Both `ancestorLevel` and `origin` need to be specified'
    );
  }
}
