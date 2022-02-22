/**
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * @typedef {import('../../types/config').Service} Service
 */

/**
 * Return the configuration for the annotation service which the client would retrieve
 * annotations from which may contain the authority, grantToken and icon.
 *
 * @param {SidebarSettings} settings
 * @return {Service|null}
 */

export function serviceConfig({ services }) {
  if (Array.isArray(services) && services[0]) {
    return services[0];
  }
  return null;
}
