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

/**
 * Return true if the EDU role survey should be shown.
 *
 * Both of these come from H: `instructor_survey` is the feature flag, which
 * doubles as the kill switch, and `show_instructor_survey` is true only while
 * the user is in the survey's audience and hasn't answered it. The client
 * deliberately doesn't know what the audience is — first-party users at
 * educational institutions — so that changing it needs no client release,
 * which would have to propagate through the CDN and the browser extension.
 *
 * No `isLoggedIn` check is needed: H only emits the preference when there is a
 * user, and the dummy profile the store starts with has no preferences.
 *
 * Takes `features` rather than `settings` so that FrameSyncService can call it
 * too, without a change to its constructor.
 */
export function shouldShowInstructorSurvey(
  profile: Profile,
  features: Record<string, boolean>,
): boolean {
  return (
    features.instructor_survey === true &&
    profile.preferences?.show_instructor_survey === true
  );
}
