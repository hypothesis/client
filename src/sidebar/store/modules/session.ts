import { createSelector } from 'reselect';

import type { Profile } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
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
  };
}

const reducers = {
  UPDATE_PROFILE(state: State, action: { profile: Profile }) {
    return {
      profile: { ...action.profile },
    };
  },
};

/**
 * Update the profile information for the current user.
 */
function updateProfile(profile: Profile) {
  return makeAction(reducers, 'UPDATE_PROFILE', { profile });
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
    updateProfile,
  },

  selectors: {
    defaultAuthority,
    features,
    hasFetchedProfile,
    isFeatureEnabled,
    isLoggedIn,
    profile,
  },
});
