import type {
  ConfigFromHost,
  ConfigFromAnnotator,
  ConfigFromEmbedder,
  ConfigFromSidebar,
  RPCSettings,
  SidebarSettings,
} from '../../types/config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';
import { getApiUrl } from './get-api-url';
import { hostPageConfig } from './host-config';

/**
 * Ascend `levels` from `window_` to find the designated embedder frame.
 *
 * @param levels - Number of ancestors levels to ascend
 */
function getEmbedderFrame(levels: number, window_: Window = window): Window {
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
 */
function fetchServiceGroups(
  configFromHost: ConfigFromHost,
  rpcSettings: RPCSettings
): ConfigFromHost {
  const services = configFromHost.services;
  if (!Array.isArray(services)) {
    return configFromHost;
  }
  services.forEach((service, index) => {
    if (service.groups === '$rpc:requestGroups') {
      // The `groups` need to be fetched from a secondary RPC call and
      // there should be no timeout as it may be waiting for user input.
      service.groups = postMessageJsonRpc
        .call<string[]>(
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
 * Derive RPC settings from the provided `ConfigFromAnnotator`, if any are present.
 */
function buildRPCSettings(
  configFromAnnotator: ConfigFromAnnotator,
  window_: Window
): RPCSettings | null {
  const rpcConfig = configFromAnnotator.requestConfigFromFrame;
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
    targetFrame: getEmbedderFrame(rpcConfig.ancestorLevel, window_),
    origin: rpcConfig.origin,
  };
}

/**
 * Retrieve host configuration from embedder frame
 */
async function getEmbedderConfig(
  configFromAnnotator: ConfigFromAnnotator,
  rpcSettings: RPCSettings
): Promise<ConfigFromEmbedder> {
  const configFromEmbedder = await postMessageJsonRpc.call<ConfigFromEmbedder>(
    rpcSettings.targetFrame,
    rpcSettings.origin,
    'requestConfig',
    [],
    3000
  );

  // In cases where host configuration is requested from the embedder frame
  // (`ConfigFromEmbedder`), `ConfigFromAnnotator` values are discarded.
  //
  // The `group` property, however, is currently not provided by
  // `ConfigFromEmbedder` and needs to be restored. This property is used by the
  // Notebook.
  // TODO: Notebook group should be set by alternate means
  return {
    ...configFromEmbedder,
    ...(configFromAnnotator.group ? { group: configFromAnnotator.group } : {}),
  };
}

/**
 * Build a `SidebarSettings` object by merging the provided `ConfigFromSidebar`
 * with host configuration (`ConfigFromAnnotator` OR `ConfigFromEmbedder`).
 *
 * @see {ConfigFromAnnotator}
 * @see {ConfigFromEmbedder}
 * @see {ConfigFromHost}
 *
 * @return The merged settings
 */
export async function buildSettings(
  configFromSidebar: ConfigFromSidebar,
  window_: Window = window
): Promise<SidebarSettings> {
  const configFromAnnotator = hostPageConfig(window);

  const rpcSettings = buildRPCSettings(configFromAnnotator, window_);
  let configFromHost;
  if (rpcSettings) {
    // The presence of RPCSettings indicates that we should
    // source the ConfigFromHost from another frame, and potentially load
    // the correct groups asynchronously as well.
    const configFromEmbedder = await getEmbedderConfig(
      configFromAnnotator,
      rpcSettings
    );
    configFromHost = fetchServiceGroups(configFromEmbedder, rpcSettings);
  } else {
    configFromHost = configFromAnnotator;
  }

  const sidebarSettings: SidebarSettings = {
    ...configFromSidebar,
    ...configFromHost,
  };
  if (rpcSettings) {
    sidebarSettings.rpc = rpcSettings;
  }
  sidebarSettings.apiUrl = getApiUrl(sidebarSettings);

  return sidebarSettings;
}
