import { useMemo } from 'preact/hooks';

import { useStoreProxy } from '../../store/use-store';
import { username } from '../../helpers/account-id';

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
  const currentUsername = username(store.profile().userid);

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

    // Convert to an array of `FilterOption` objects
    const userOptions = Object.keys(users).map(user => {
      // If the user is the current user, add "(Me)" to the displayed name
      const display =
        user === currentUsername ? `${users[user]} (Me)` : users[user];
      return { display, value: user };
    });

    userOptions.sort((a, b) => {
      // Ensure that the current user "Me" resides at the front of the list
      if (currentUsername === a.value) {
        return -1;
      } else if (currentUsername === b.value) {
        return 1;
      } else {
        return a.display.localeCompare(b.display);
      }
    });

    return userOptions;
  }, [annotations, currentUsername, focusFilters.user, showDisplayNames]);
}
