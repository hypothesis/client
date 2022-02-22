import { getApiUrl } from './get-api-url';
import { hostPageConfig } from './host-config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @typedef {import('../../types/config').ConfigFromSidebar} ConfigFromSidebar
 * @typedef {import('../../types/config').ConfigFromHost} ConfigFromHost
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
 * Retrieve host configuration and list of groups from `targetFrame` via RPC
 *
 * @param {Window} targetFrame
 * @param {string} origin - Origin filter for `window.postMessage` call
 * @return {Promise<ConfigFromHost>}
 */
async function fetchConfigRPC(targetFrame, origin) {
  const configFromHost = await postMessageJsonRpc.call(
    targetFrame,
    origin,
    'requestConfig',
    [],
    3000
  );
  // Closure for the RPC call to scope parentFrame and origin variables.
  const rpcCall = (method, args = [], timeout = 3000) =>
    postMessageJsonRpc.call(targetFrame, origin, method, args, timeout);
  return fetchGroupsAsync(configFromHost, rpcCall);
}

/**
 * Check the host configuration object to see if the list of groups should be
 * retrieved via RPC. If so, replace the `groups` value with the results of
 * an applicable RPC call.
 *
 * This allows the app to start with an incomplete config and then lazily
 * fill in the `groups` value(s) later when its ready. This helps speed
 * up the loading process.
 *
 * @param {ConfigFromHost} configFromHost - Host configuration object. This
 *   may be mutated with a list of groups fetched by RPC.
 * @param {function} rpcCall - RPC method
 *  (method, args, timeout) => Promise
 * @return {Promise<ConfigFromHost>} - The mutated host configuration
 */
async function fetchGroupsAsync(configFromHost, rpcCall) {
  if (Array.isArray(configFromHost.services)) {
    configFromHost.services.forEach((service, index) => {
      if (service.groups === '$rpc:requestGroups') {
        // Groups should be fetched by RPC. Do not set a timeout as we may
        // be waiting on user input (e.g. re-authorization).
        service.groups = rpcCall('requestGroups', [index], null).catch(() => {
          throw new Error('Unable to fetch groups');
        });
      }
    });
  }
  return configFromHost;
}

/**
 * Find the right host configuration object to use to configure the sidebar.
 * This is either:
 *
 * - The configuration values encoded in `configFromURL`, a URL fragment
 *   encoded by the annotator based on configuration JS/JSON from the
 *   embedding host page, OR
 * - A configuration object retrieved by RPC to an ancestor frame (used by
 *   the LMS app)
 *
 * @param {ConfigFromHost} configFromURL
 * @param {Window} window_
 * @returns {Promise<ConfigFromHost>}
 */
async function findConfigFromHost(configFromURL, window_ = window) {
  // Properties on `configFromURL` indicate whether it should be used
  // directly as host configuration, or if we should instead request
  // host configuration by RPC
  const requestConfigFromFrame = configFromURL.requestConfigFromFrame;

  if (!requestConfigFromFrame) {
    return configFromURL;
  }

  if (
    typeof requestConfigFromFrame.ancestorLevel === 'number' &&
    typeof requestConfigFromFrame.origin === 'string'
  ) {
    const configFromHost = await fetchConfigRPC(
      getAncestorFrame(requestConfigFromFrame.ancestorLevel, window_),
      requestConfigFromFrame.origin
    );

    // Add back the optional focused group ID from the URL-fragment configuration
    // as this is needed in the Notebook
    return {
      ...configFromHost,
      ...(configFromURL.group ? { group: configFromURL.group } : {}),
    };
  } else {
    throw new Error(
      'Improper `requestConfigFromFrame` object. Both `ancestorLevel` and `origin` need to be specified'
    );
  }
}

/**
 * Build a settings object by merging `configFromSidebar` with appropriate
 * host configuration.
 *
 * @param {ConfigFromSidebar} configFromSidebar
 * @param {Window} window_ - Test seam
 * @return {Promise<SidebarSettings>}
 */
export async function buildSettings(configFromSidebar, window_ = window) {
  const configFromURL = hostPageConfig(window_);

  const configFromHost = await findConfigFromHost(configFromURL, window_);

  const sidebarSettings = {
    ...configFromSidebar,
    ...configFromHost,
  };
  sidebarSettings.apiUrl = getApiUrl(sidebarSettings);
  return sidebarSettings;
}
