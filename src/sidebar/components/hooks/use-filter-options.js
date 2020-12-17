import { useMemo } from 'preact/hooks';

import { useStoreProxy } from '../../store/use-store';
import { username } from '../../util/account-id';

/** @typedef {import('../../store/modules/filters').FilterOption} FilterOption */

/**
 * Generate a list of users for filtering annotations; update when set of
 * annotations or filter state changes meaningfully.
 *
 * @return {FilterOption[]}
 */
export function useUserFilterOptions() {
  const store = useStoreProxy();
  const annotations = store.allAnnotations();
  const focusFilters = store.getFocusFilters();
  const showDisplayNames = store.isFeatureEnabled('client_display_names');

  return useMemo(() => {
    // Determine unique users (authors) in annotation collection
    const users = {};
    annotations.forEach(annotation => {
      const username_ = username(annotation.user);
      const displayValue =
        showDisplayNames && annotation.user_info?.display_name
          ? annotation.user_info.display_name
          : username_;
      users[username_] = displayValue;
    });

    // If user-focus is configured (even if not applied) add a filter
    // option for that user. Note that this always respects the display
    // value, even if `client_display_names` feature flags is not enabled:
    // this matches current implementation of focus mode.
    if (focusFilters.user) {
      const username_ =
        username(focusFilters.user.value) || focusFilters.user.value;
      users[username_] = focusFilters.user.display;
    }

    // Convert to `FilterOption` objects
    const userOptions = Object.keys(users).map(user => {
      return { display: users[user], value: user };
    });

    userOptions.sort((a, b) => a.display.localeCompare(b.display));

    return userOptions;
  }, [annotations, focusFilters, showDisplayNames]);
}
