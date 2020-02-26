import getApiUrl from '../get-api-url';

import * as postMessageJsonRpc from './postmessage-json-rpc';


/**
 * Merge client configuration from h service with config fetched from
 * an embedding frame synchronously.
 * 
 * Use this method to retrieve the config synchronously from the embedding
 * frame's query string. See tests for more details.
 *
 * @param {Object} appConfig - App config settings rendered into `app.html` by the h service.
 * @param {Object} hostPageConfig - App configuration specified by the embedding  frame.
 * @return {Object} - The merged settings.
 */
export function fetchConfig(appConfig, hostPageConfig) {
  const mergedConfig = {
    ...appConfig, 
    ...hostPageConfig,
  };
  mergedConfig.apiUrl = getApiUrl(mergedConfig);
  return mergedConfig;
}

/**
 * Merge client configuration from h service with config fetched from
 * an embedding frame asynchronously.
 * 
 * Use this method to retrieve the config asynchronously from an ancestor 
 * frame via RPC. See tests for more details.
 *
 * @param {Object} appConfig - Settings rendered into `app.html` by the h service.
 * @param {Window} parentFrame - Frame to send call to.
 * @param {string} origin - Origin filter for `window.postMessage` call.
 * @return {Promise<Object>} - The merged settings.
 */
export async function fetchConfigRpc(appConfig, parentFrame, origin) {
  const remoteConfig = await postMessageJsonRpc.call(
    parentFrame,
    origin,
    'requestConfig',
    [],
    3000
  );
  return Promise.resolve(fetchConfig(appConfig, remoteConfig));
}

