import { getApiUrl } from './get-api-url';
import { hostPageConfig } from './host-config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @typedef {import('../../types/config').ConfigFromHost} ConfigFromHost
 * @typedef {import('../../types/config').ConfigFromAnnotator} ConfigFromAnnotator
 * @typedef {import('../../types/config').ConfigFromEmbedder} ConfigFromEmbedder
 * @typedef {import('../../types/config').ConfigFromSidebar} ConfigFromSidebar
 * @typedef {import('../../types/config').RPCSettings} RPCSettings
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * @typedef {import('../../types/config').Service['groups']} ServiceGroups
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
 * Which groups to load and show in the sidebar may be dictated in
 * ConfigFromHost configuration: the special value `$rpc:requestGroups`
 * indicates that the list of groups should be requested asynchronously.
 *
 * This function (maybe) mutates values in the provided `configFromHost`'s
 * ServiceGroups: `$rpc:requestGroups` values are replaced with
 * `Promise<string[]>`.
 *
 * @see ServiceGroups
 *
 * @param {ConfigFromHost} configFromHost
 * @param {RPCSettings} rpcSettings
 * @returns {ConfigFromHost}
 */
function fetchServiceGroups(configFromHost, rpcSettings) {
  const services = configFromHost.services;
  if (!Array.isArray(services)) {
    return configFromHost;
  }
  services.forEach((service, index) => {
    if (service.groups === '$rpc:requestGroups') {
      // The `groups` need to be fetched from a secondary RPC call and
      // there should be no timeout as it may be waiting for user input.
      service.groups = postMessageJsonRpc
        .call(
          rpcSettings.targetFrame,
          rpcSettings.origin,
          'requestGroups',
          [index],
          0 // no timeout
        )
        .catch(() => {
          throw new Error('Unable to fetch groups');
        });
    }
  });
  return configFromHost;
}

/**
 * Derive RPC settings from the provided `AnnotatorConfigFromHost`, if any are present.
 *
 * @param {ConfigFromAnnotator} configFromHost
 * @param {Window} window_
 * @return {import('../../types/config').RPCSettings|null}
 */
function buildRPCSettings(configFromHost, window_) {
  const rpcConfig = configFromHost.requestConfigFromFrame;
  if (!rpcConfig) {
    return null;
  } else if (
    typeof rpcConfig.ancestorLevel !== 'number' ||
    typeof rpcConfig.origin !== 'string'
  ) {
    throw new Error(
      'Improper `requestConfigFromFrame` object. Both `ancestorLevel` and `origin` need to be specified'
    );
  }
  return {
    targetFrame: getAncestorFrame(rpcConfig.ancestorLevel, window_),
    origin: rpcConfig.origin,
  };
}

/**
 * Retrieve ConfigFromHost to use for settings from the ancestor frame indicated
 * in `rpcSettings`
 *
 * @param {ConfigFromAnnotator} hostConfigFromURL
 * @param {RPCSettings} rpcSettings
 * @return {Promise<ConfigFromEmbedder>}
 */
async function getEmbedderConfig(hostConfigFromURL, rpcSettings) {
  const hostConfigFromFrame = await postMessageJsonRpc.call(
    rpcSettings.targetFrame,
    rpcSettings.origin,
    'requestConfig',
    [],
    3000
  );

  // In the case where the appropriate `ConfigFromHost` is sourced from another
  // frame by RPC, the original `ConfigFromHost` (`hostConfigFromURL`) is
  // discarded.
  //
  // The `group` property, however, is currently not available in the remote
  // `ConfigFromHost` and needs to be restored. This property is used by the
  // Notebook.
  return {
    ...hostConfigFromFrame,
    ...(hostConfigFromURL.group ? { group: hostConfigFromURL.group } : {}),
  };
}

/**
 * Build a `SidebarSettings` object by merging the provided `ConfigFromSidebar`
 * with `ConfigFromHost` from an appropriate source.
 *
 * `ConfigFromHost` may come from either:
 *  - The URL framgent of the sidebar's iframe src, written by the annotator
 *    when creating the sidebar's iframe, OR
 *  - By sending an RPC request for host configuration to a designated ancestor
 *    frame (This is used in the LMS context)
 *
 * @param {ConfigFromSidebar} configFromSidebar
 * @param {Window} window_ - Test seam
 * @return {Promise<SidebarSettings>} - The merged settings
 */
export async function buildSettings(configFromSidebar, window_ = window) {
  const annotatorConfigFromHost = hostPageConfig(window);

  const rpcSettings = buildRPCSettings(annotatorConfigFromHost, window_);
  let configFromHost;
  if (rpcSettings) {
    // The presence of RPCSettings indicates that we should
    // source the ConfigFromHost from another frame, and potentially load
    // the correct groups asynchronously as well.
    const hostConfigFromFrame = await getEmbedderConfig(
      annotatorConfigFromHost,
      rpcSettings
    );
    configFromHost = fetchServiceGroups(hostConfigFromFrame, rpcSettings);
  } else {
    configFromHost = annotatorConfigFromHost;
  }

  /** @type {SidebarSettings} */
  const sidebarSettings = {
    ...configFromSidebar,
    ...configFromHost,
  };
  if (rpcSettings) {
    sidebarSettings.rpc = rpcSettings;
  }
  sidebarSettings.apiUrl = getApiUrl(sidebarSettings);

  return sidebarSettings;
}
