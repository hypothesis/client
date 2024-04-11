import { useEffect, useState } from 'preact/hooks';

import { withServices } from '../service-context';
import type { DashboardService } from '../services/dashboard';
import MenuItem from './MenuItem';

export type OpenDashboardMenuItemProps = {
  isMenuOpen: boolean;

  // Injected
  dashboard: DashboardService;
};

function OpenDashboardMenuItem({
  dashboard,
  isMenuOpen,
}: OpenDashboardMenuItemProps) {
  const [authToken, setAuthToken] = useState<string>();
  useEffect(() => {
    // Fetch a new auth token every time the menu containing this item is open,
    // to make sure we always have an up-to-date one
    if (isMenuOpen) {
      dashboard
        .getAuthToken()
        .then(setAuthToken)
        .catch(error =>
          console.warn('An error occurred while getting auth token', error),
        );
    }

    // Discard previous token just before trying to fetch a new one
    return () => setAuthToken(undefined);
  }, [dashboard, isMenuOpen]);

  return (
    <MenuItem
      label="Open dashboard"
      isDisabled={!authToken}
      onClick={() => authToken && dashboard.open(authToken)}
    />
  );
}

export default withServices(OpenDashboardMenuItem, ['dashboard']);
