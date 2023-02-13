/** @typedef {import('../../types/config').SidebarSettings} SidebarSettings */
import { serviceConfig } from './service-config';

/**
 * Function that returns apiUrl from the settings object.
 *
 * @param {SidebarSettings} settings - The settings object
 * @return {string} The apiUrl from the service or the default apiUrl from the settings
 * @throws {Error} If the settings has a service but the service doesn't have an apiUrl
 *
 */
export function getApiUrl(settings) {
  const service = serviceConfig(settings);

  if (service) {
    // If the host page contains a service setting then the client should default to
    // using that apiUrl.
    if (service.apiUrl) {
      return service.apiUrl;
    } else {
      throw new Error('Service should contain an apiUrl value.');
    }
  }
  return settings.apiUrl;
}
