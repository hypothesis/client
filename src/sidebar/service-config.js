/**
 * @typedef {import('../types/config').HostConfig} HostConfig
 * @typedef {import('../types/config').Service} Service
 */

/**
 * Return the configuration for the annotation service which the client would retrieve
 * annotations from which may contain the authority, grantToken and icon.
 *
 * @param {HostConfig} settings
 * @return {Service|null}
 */

export default function serviceConfig(settings) {
  if (!Array.isArray(settings.services) || settings.services.length === 0) {
    return null;
  }
  return settings.services[0];
}
