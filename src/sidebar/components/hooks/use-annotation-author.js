import { useMemo } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import { isThirdPartyUser, username } from '../../helpers/account-id';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import('../../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * Generate the appropriate display name for an annotation's author.
 *
 * @param {Annotation} annotation
 * @return {string}
 */
export function useAnnotationAuthorName(annotation) {
  const store = useSidebarStore();
  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');

  return useMemo(() => {
    const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);

    const useDisplayName = displayNamesEnabled || isThirdParty;

    const authorDisplayName =
      useDisplayName && annotation.user_info?.display_name
        ? annotation.user_info.display_name
        : username(annotation.user);

    return authorDisplayName;
  }, [annotation, defaultAuthority, displayNamesEnabled]);
}

/**
 * Determine the user-page URL for the author of an annotation or undefined
 * if one cannot be generated.
 *
 * @param {Annotation} annotation
 * @param {SidebarSettings} settings
 * @return {string|undefined}
 */
export function useAnnotationAuthorLink(annotation, settings) {
  const store = useSidebarStore();
  const defaultAuthority = store.defaultAuthority();
  const isThirdParty = isThirdPartyUser(annotation.user, defaultAuthority);
  const authorLink = !isThirdParty
    ? store.getLink('user', { user: annotation.user })
    : undefined;

  return useMemo(() => {
    if (isThirdParty && settings.usernameUrl) {
      return `${settings.usernameUrl}${username(annotation.user)}`;
    }
    return authorLink;
  }, [authorLink, settings.usernameUrl, annotation.user, isThirdParty]);
}
