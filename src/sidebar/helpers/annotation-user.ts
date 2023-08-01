import type { Annotation } from '../../types/api';
import type { SidebarSettings } from '../../types/config';
import { isThirdPartyUser, username } from './account-id';

/**
 * What string should we use to represent the author (user) of a given
 * annotation: a display name or a username?
 *
 * The nice, human-readable display name should be used when a display_name
 * is available on the annotation AND:
 * - The author (user) associated with the annotation is a third-party user, OR
 * - The `client_display_names` feature flag is enabled
 *
 * Return the string that should be used for display on an annotation: either the
 * username or the display name.
 */
export function annotationDisplayName(
  annotation: Pick<Annotation, 'user' | 'user_info'>,
  defaultAuthority: string,
  displayNamesEnabled: boolean,
): string {
  const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);

  const useDisplayName = displayNamesEnabled || isThirdParty;
  return useDisplayName && annotation.user_info?.display_name
    ? annotation.user_info.display_name
    : username(annotation.user);
}

/**
 * Return a URL to the annotation author's user page, when available. Author
 * links for third-party users are only available if a `usernameUrl` is
 * provided in `settings`.
 */
export function annotationAuthorLink(
  annotation: Pick<Annotation, 'user'>,
  settings: SidebarSettings,
  defaultAuthority: string,
  userLink?: string,
): string | undefined {
  const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);

  if (!isThirdParty && userLink) {
    return userLink;
  }

  return (
    (settings.usernameUrl &&
      `${settings.usernameUrl}${username(annotation.user)}`) ??
    undefined
  );
}
