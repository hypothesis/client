import type { Profile } from '../../types/api';
import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';

/**
 * The following things must all be true for the tutorial component to auto-display
 * on app launch:
 * - The app must be operating within the "sidebar" (i.e. not single-annotation
 *   or stream mode); AND
 * - No configuration is present in `settings.services` indicating
 *   that the host wants to handle its own help requests (i.e. no event handler
 *   is provided to intercept the default help panel), AND
 * - A user profile is loaded in the current state that indicates a `true` value
 *   for the `show_sidebar_tutorial` preference (i.e. the tutorial has not been
 *   dismissed by this user yet). This implies the presence of a profile, which
 *   in turn implies that there is an authenticated user.
 *
 * @param isSidebar - is the app currently displayed in a sidebar?
 * @param profile - User profile returned from the API
 * @return Tutorial panel should be displayed automatically
 */
export function shouldAutoDisplayTutorial(
  isSidebar: boolean,
  profile: Profile,
  settings: SidebarSettings,
): boolean {
  if (!isSidebar) {
    return false;
  }

  const shouldShowBasedOnProfile =
    typeof profile.preferences === 'object' &&
    !!profile.preferences.show_sidebar_tutorial;
  if (!shouldShowBasedOnProfile) {
    return false;
  }

  const config = serviceConfig(settings);
  if (config?.onHelpRequestProvided || config?.enableHelpPanel === false) {
    return false;
  }

  return true;
}

/**
 * Return true if the YouTube disclaimer banner should be shown.
 * Show when the assignment is a YouTube assignment (from LMS config) and the
 * user has not yet dismissed the disclaimer (H backend sends show_youtube_gdpr_banner: true).
 *
 * @param settings - Sidebar settings (includes youtubeAssignment from embedder)
 * @param profile - User profile from the API
 * @return Whether to show the YouTube disclaimer banner
 */
export function shouldShowYoutubeDisclaimer(
  settings: SidebarSettings,
  profile: Profile,
): boolean {
  if (settings.youtubeAssignment !== true) {
    return false;
  }
  return profile.preferences?.show_youtube_gdpr_banner === true;
}
