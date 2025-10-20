import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';

/**
 * Generate a URI for sharing: a bouncer link built to share annotations in
 * a specific group (groupID) on a specific document (documentURI). If the
 * `documentURI` provided is not a web-accessible URL, no link is generated.
 */
export function pageSharingLink(
  documentURI: string,
  groupId: string,
): string | null {
  if (!isShareableURI(documentURI)) {
    return null;
  }
  return `https://hyp.is/go?url=${encodeURIComponent(
    documentURI,
  )}&group=${groupId}`;
}

/**
 * Are annotations made against `uri` meaningfully shareable? The
 * target URI needs to be available on the web, which here is determined by
 * a protocol of `http` or `https`.
 */
export function isShareableURI(uri: string): boolean {
  return /^http(s?):/i.test(uri);
}

/**
 * Return true if annotation sharing is globally enabled in the client's
 * configuration.
 *
 * Sharing is enabled by default but can be disabled when a third party
 * authority is being used.
 */
export function sharingEnabled(settings: SidebarSettings): boolean {
  const service = serviceConfig(settings);
  return !settings.commentsMode && service?.enableShareLinks !== false;
}
