import { createSelector } from 'reselect';

import type { Profile } from '../../../types/api';
// SidebarSettings is no longer needed as defaultAuthority is static
// import type { SidebarSettings } from '../../../types/config';
import { createStoreModule /*, makeAction */ } from '../create-store'; // makeAction no longer needed

export type State = {
  /**
   * The app's default authority. Static in this version.
   */
  defaultAuthority: string;

  /**
   * Feature flags from external sources (e.g., LMS app).
   * Profile features are now part of the static defaultProfile.
   */
  features: string[]; // Kept for compatibility if external features are still used

  /**
   * Static profile for "Default_User".
   */
  profile: Profile;
};

/**
 * The static profile for "Default_User".
 */
const defaultUserProfile: Profile = {
  userid: 'Default_User',
  user_info: {
    display_name: 'Default User',
    // Other user_info fields can be added here if needed, e.g.,
    // authority: 'default.local', // Or whatever is appropriate
  },
  /** A map of features that are enabled for the "Default_User". */
  features: {
    // Example: pre-define features for Default_User if necessary
    // "some_feature_flag": true,
  },
  /** A map of preference names and values for "Default_User". */
  preferences: {
    // Example: pre-define preferences
    // "show_sidebar_tutorial": false,
  },
  // Other Profile fields can be added here if they have sensible defaults
  // groups: [], // Example if 'groups' is part of Profile
};

function initialState(/* settings: SidebarSettings */): State {
  // Settings are no longer used to initialize session state
  return {
    defaultAuthority: 'default.local', // Static default authority
    features: [] /* settings.features ?? [] */, // External features, if any, could still come from settings if needed
    profile: defaultUserProfile,
  };
}

// Reducers are now empty as the profile is static and not updated via actions.
const reducers = {
  // UPDATE_PROFILE reducer is removed.
};

// updateProfile action creator is removed.

function defaultAuthority(state: State) {
  return state.defaultAuthority;
}

/**
 * Return true as the "Default_User" is always considered logged in.
 */
function isLoggedIn(_state: State) {
  return true;
}

/**
 * Return the effective set of feature flags. This combines feature flags from
 * the static profile with those from other external sources (e.g., LMS settings).
 */
const features = createSelector(
  (state: State) => state.profile, // Uses the static defaultUserProfile
  (state: State) => state.features, // External features
  (profile: Profile, externalFeatures: string[]): Record<string, boolean> => {
    const combinedFeatures = { ...profile.features };
    for (const feat of externalFeatures) {
      combinedFeatures[feat] = true;
    }
    return combinedFeatures;
  },
);

/**
 * Return true if a given feature flag is enabled for the current user.
 */
function isFeatureEnabled(state: State, feature: string) {
  return Boolean(features(state)[feature]);
}

/**
 * Return true as the profile is statically set and considered "fetched".
 */
function hasFetchedProfile(_state: State) {
  return true;
}

/**
 * Return the static "Default_User" profile.
 */
function profile(state: State) {
  return state.profile;
}

export const sessionModule = createStoreModule(initialState, {
  namespace: 'session',
  reducers,

  // updateProfile actionCreator is removed
  actionCreators: {},

  selectors: {
    defaultAuthority,
    features,
    hasFetchedProfile,
    isFeatureEnabled,
    isLoggedIn,
    profile,
  },
});
