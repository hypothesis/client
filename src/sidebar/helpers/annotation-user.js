/**
 * @typedef {import("../../types/api").Annotation} Annotation
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * @typedef {import('../store').SidebarStore} SidebarStore
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
 * @param {SidebarStore} store
 *
 * @return {string}
 */
export function annotationDisplayName(annotation, store) {
  const defaultAuthority = store.defaultAuthority();
  const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);

  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');

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
 * @param {SidebarStore} store
 * @param {SidebarSettings} settings
 */
export function annotationAuthorLink(annotation, store, settings) {
  const defaultAuthority = store.defaultAuthority();
  const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);

  if (!isThirdParty) {
    return store.getLink('user', { user: annotation.user });
  }

  return (
    (settings.usernameUrl &&
      `${settings.usernameUrl}${username(annotation.user)}`) ??
    undefined
  );
}

/**
 * Retrieve both author display name and link.
 *
 * @param {Pick<Annotation, 'user'|'user_info'>} annotation
 * @param {SidebarStore} store
 * @param {SidebarSettings} settings
 */
export function annotationAuthorInfo(annotation, store, settings) {
  return {
    authorDisplayName: annotationDisplayName(annotation, store),
    authorLink: annotationAuthorLink(annotation, store, settings),
  };
}
