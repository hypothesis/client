import type { SidebarSettings, Service } from '../../types/config';

/**
 * Return the configuration for the annotation service which the client would retrieve
 * annotations from which may contain the authority, grantToken and icon.
 */

export function serviceConfig({ services }: SidebarSettings): Service | null {
  if (Array.isArray(services) && services[0]) {
    return services[0];
  }
  return null;
}
