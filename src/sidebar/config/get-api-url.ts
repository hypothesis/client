import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from './service-config';

/**
 * Function that returns apiUrl from the settings object.
 *
 * @return The apiUrl from the service or the default apiUrl from the settings
 * @throws {Error} If the settings has a service but the service doesn't have an apiUrl
 */
export function getApiUrl(settings: SidebarSettings): string {
  const service = serviceConfig(settings);
  if (!service) {
    return settings.apiUrl;
  }

  // If the host page contains a service setting then the client should default
  // to using that apiUrl.
  if (service.apiUrl) {
    return service.apiUrl;
  }

  throw new Error('Service should contain an apiUrl value.');
}
