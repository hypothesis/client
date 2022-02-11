import { getApiUrl } from './get-api-url';
import { hostPageConfig } from './host-config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @typedef {import('../../types/config').SidebarConfig} SidebarConfig
 * @typedef {import('../../types/config').HostConfig} HostConfig
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @deprecated
 */
function ancestors(window_) {
  if (window_ === window_.top) {
    return [];
  }

  // nb. The top window's `parent` is itself!
  const ancestors = [];
  do {
    window_ = window_.parent;
    ancestors.push(window_);
  } while (window_ !== window_.top);

  return ancestors;
}

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
 * @deprecated
 * Fetch client configuration from an ancestor frame.
 *
 * @param {string} origin - The origin of the frame to fetch config from.
 * @param {Window} window_ - Test seam.
 * @return {Promise<any>}
 */
function fetchConfigFromAncestorFrame(origin, window_ = window) {
  const configResponses = [];

  for (let ancestor of ancestors(window_)) {
    const timeout = 3000;
    const result = postMessageJsonRpc.call(
      ancestor,
      origin,
      'requestConfig',
      [],
      timeout
    );
    configResponses.push(result);
  }

  if (configResponses.length === 0) {
    configResponses.push(Promise.reject(new Error('Client is top frame')));
  }

  return Promise.race(configResponses);
}

/**
 * Retrieve host configuration by RPC from another frame
 *
 * @param {Window} targetFrame - Frame to request configuration from
 * @param {string} origin - Origin filter for `window.postMessage` call.
 * @return {Promise<HostConfig>}
 */
async function fetchHostConfigRPC(targetFrame, origin) {
  const remoteConfig = await postMessageJsonRpc.call(
    targetFrame,
    origin,
    'requestConfig',
    [],
    3000
  );
  // Closure for the RPC call to scope parentFrame and origin variables.
  const rpcCall = (method, args = [], timeout = 3000) =>
    postMessageJsonRpc.call(targetFrame, origin, method, args, timeout);
  return fetchGroupsAsync(remoteConfig, rpcCall);
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
 * @param {object} config - The configuration object to mutate. This should
 *  already have the `services` value
 * @param {function} rpcCall - RPC method
 *  (method, args, timeout) => Promise
 * @return {Promise<object>} - The mutated settings
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
 * Find and retrieve the correct host configuration for the sidebar.
 *
 * Host configuration may come from one of three places:
 * - From the embedding (host) document frame.
 *   The annotator encodes JavaScript/JSON settings from the host frame as a
 *   URL fragment on the sidebar frame's `src`. In this (common) case,
 *   use the parsed `configFromURL` itself as the host configuration.
 * - From a known parent frame, requested by RPC (e.g. LMS).
 *   Send a single RPC request to a known frame to retrieve host configuration
 * - From an ancestor frame, using RPC (deprecated)
 *   Send RPC requests for configuration to ancestor frames until we
 *   (hopefully) find a host configuration.
 *
 * In cases where configuration is retrieved by RPC, the `configFromURL` object
 * values are not retained in the returned host configuration. Note the
 * exception related to the `group` property below.
 *
 * @param {HostConfig} configFromURL
 * @param {Window} [window_]
 * @returns {Promise<HostConfig>}
 */
async function findHostConfiguration(configFromURL, window_) {
  const requestConfigFromFrame = configFromURL.requestConfigFromFrame;

  if (!requestConfigFromFrame) {
    // In this case, the `configFromURL` is retained and used as host configuration
    return configFromURL;
  }

  if (typeof requestConfigFromFrame === 'string') {
    return await fetchConfigFromAncestorFrame(requestConfigFromFrame, window_);
  } else if (
    typeof requestConfigFromFrame.ancestorLevel === 'number' &&
    typeof requestConfigFromFrame.origin === 'string'
  ) {
    const hostConfiguration = await fetchHostConfigRPC(
      getAncestorFrame(requestConfigFromFrame.ancestorLevel, window_),
      requestConfigFromFrame.origin
    );

    // Manually add a `group` property to the host configuration if
    // it was present on `configFromURL`. This allows a focused group to be
    // available to the Notebook within LMS contexts.
    // FIXME: This could be organized/typed more elegantly.
    if (configFromURL.group && !hostConfiguration.group) {
      hostConfiguration.group = configFromURL.group;
    }
    return hostConfiguration;
  } else {
    throw new Error(
      'Improper `requestConfigFromFrame` object. Both `ancestorLevel` and `origin` need to be specified'
    );
  }
}

/**
 * Build a settings object for use in the sidebar by extending provided base
 * configuration with the correct "host configuration" settings.
 *
 * @param {SidebarConfig} sidebarConfiguration
 * @param {Window} [window_]
 * @returns {Promise<MergedConfig>}
 */
export async function buildSettings(sidebarConfiguration, window_ = window) {
  const configFromURL = hostPageConfig(window_);
  const hostConfiguration = await findHostConfiguration(configFromURL, window_);

  const settings = {
    ...sidebarConfiguration,
    ...hostConfiguration,
  };
  settings.apiUrl = getApiUrl(settings);

  return settings;
}
