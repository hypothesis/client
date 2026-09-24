import { createSelector } from 'reselect';

import type { Profile } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import { shouldShowInstructorSurvey } from '../../helpers/session';
import { createStoreModule, makeAction } from '../create-store';

export type State = {
  /**
   * The app's default authority (user identity provider), from settings,
   * e.g. `hypothes.is` or `localhost`
   *
   * FIXME: This is an empty string when `authDomain` is missing
   * because other app logic has long assumed its string-y presence:
   * behavior when it's missing is undefined. This setting should be
   * enforced similarly to how `apiUrl` is enforced.
   */
  defaultAuthority: string;

  /**
   * Feature flags to enable, in addition to those that are enabled in the
   * user's profile.
   *
   * This is used in the LMS app for example to enable features based on the
   * LMS app installation in use, rather than the active H user account.
   */
  features: string[];

  /**
   * Profile object fetched from the `/api/profile` endpoint.
   */
  profile: Profile;

  /**
   * How many times the user has been pointed at the EDU role survey because
   * they tried to annotate while it blocks the sidebar. Only changes matter:
   * the survey panel draws attention to itself on each one.
   */
  instructorSurveyNudges: number;
};

/**
 * A dummy profile returned by the `profile` selector before the real profile
 * is fetched.
 */
const initialProfile: Profile = {
  /** A map of features that are enabled for the current user. */
  features: {},
  /** A map of preference names and values. */
  preferences: {},
  /**
   * The authenticated user ID or null if the user is not logged in.
   */
  userid: null,
};

function initialState(settings: SidebarSettings): State {
  return {
    defaultAuthority: settings?.authDomain ?? '',
    features: settings.features ?? [],
    profile: initialProfile,
    instructorSurveyNudges: 0,
  };
}

const reducers = {
  UPDATE_PROFILE(state: State, action: { profile: Profile }) {
    return {
      profile: { ...action.profile },
    };
  },

  NUDGE_INSTRUCTOR_SURVEY(state: State) {
    return { instructorSurveyNudges: state.instructorSurveyNudges + 1 };
  },
};

/**
 * Update the profile information for the current user.
 */
function updateProfile(profile: Profile) {
  return makeAction(reducers, 'UPDATE_PROFILE', { profile });
}

/**
 * Point the user at the EDU role survey: they tried to do something it blocks.
 */
function nudgeInstructorSurvey() {
  return makeAction(reducers, 'NUDGE_INSTRUCTOR_SURVEY', undefined);
}

function defaultAuthority(state: State) {
  return state.defaultAuthority;
}

/**
 * Return true if a user is logged in and false otherwise.
 */
function isLoggedIn(state: State) {
  return state.profile.userid !== null;
}

/**
 * Return the effective set of feature flags. This combines feature flags from
 * the profile with those from other sources.
 */
const features = createSelector(
  (state: State) => state.profile,
  (state: State) => state.features,
  (profile: Profile, features: string[]): Record<string, boolean> => {
    const combinedFeatures = { ...profile.features };
    for (const feat of features) {
      combinedFeatures[feat] = true;
    }
    return combinedFeatures;
  },
);

/**
 * Return true if a given feature flag is enabled for the current user.
 *
 * @param feature - The name of the feature flag. This matches the name of the
 *   feature flag as declared in the Hypothesis service.
 */
function isFeatureEnabled(state: State, feature: string) {
  return Boolean(features(state)[feature]);
}

/**
 * Return true if the EDU role survey is being asked of this user.
 *
 * The single source of truth for the survey's visibility, shared by the panel
 * and by FrameSyncService, so that the two can't disagree about whether the
 * survey is up.
 */
function isInstructorSurveyPending(state: State) {
  return shouldShowInstructorSurvey(state.profile, features(state));
}

function instructorSurveyNudges(state: State) {
  return state.instructorSurveyNudges;
}

/**
 * Return true if the user's profile has been fetched. This can be used to
 * distinguish the dummy profile returned by `profile()` on startup from a
 * logged-out user profile returned by the server.
 */
function hasFetchedProfile(state: State) {
  return state.profile !== initialProfile;
}

/**
 * Return the user's profile.
 *
 * Returns the current user's profile fetched from the `/api/profile` endpoint.
 *
 * If the profile has not yet been fetched yet, a dummy logged-out profile is
 * returned. This allows code to skip a null check.
 *
 * NOTE: To check the set of enabled features, use the {@link features} selector
 * instead, since it combines features from the profile and other sources.
 */
function profile(state: State) {
  return state.profile;
}

export const sessionModule = createStoreModule(initialState, {
  namespace: 'session',
  reducers,

  actionCreators: {
    nudgeInstructorSurvey,
    updateProfile,
  },

  selectors: {
    defaultAuthority,
    features,
    hasFetchedProfile,
    isFeatureEnabled,
    instructorSurveyNudges,
    isInstructorSurveyPending,
    isLoggedIn,
    profile,
  },
});
