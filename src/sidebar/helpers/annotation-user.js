/**
 * @typedef {import("../../types/api").Annotation} Annotation
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

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
 *
 * @param {Pick<Annotation, 'user'|'user_info'>} annotation
 * @param {string} defaultAuthority
 * @param {boolean} displayNamesEnabled
 *
 * @return {string}
 */
export function annotationDisplayName(
  annotation,
  defaultAuthority,
  displayNamesEnabled
) {
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
 *
 * @param {Pick<Annotation, 'user'>} annotation
 * @param {SidebarSettings} settings
 * @param {string} defaultAuthority
 * @param {string} [userLink]
 */
export function annotationAuthorLink(
  annotation,
  settings,
  defaultAuthority,
  userLink
) {
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
