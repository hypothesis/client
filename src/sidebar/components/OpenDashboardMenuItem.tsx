import { useCallback, useEffect, useState } from 'preact/hooks';

import { withServices } from '../service-context';
import type { DashboardService } from '../services/dashboard';
import type { ToastMessengerService } from '../services/toast-messenger';
import MenuItem from './MenuItem';

export type OpenDashboardMenuItemProps = {
  isMenuOpen: boolean;

  // Injected
  dashboard: DashboardService;
  toastMessenger: ToastMessengerService;
};

function OpenDashboardMenuItem({
  dashboard,
  isMenuOpen,
  toastMessenger,
}: OpenDashboardMenuItemProps) {
  const [authTokenOrError, setAuthTokenOrError] = useState<string | Error>();
  // Token is loading until we get it or an error occurs
  const loading = !authTokenOrError;

  const onClick = useCallback(() => {
    if (typeof authTokenOrError === 'string') {
      dashboard.open(authTokenOrError);
      return;
    }

    if (authTokenOrError) {
      toastMessenger.error("Can't open dashboard: You must reload the page.", {
        autoDismiss: false,
      });
    }
  }, [authTokenOrError, dashboard, toastMessenger]);

  useEffect(() => {
    // Fetch a new auth token every time the menu containing this item is open,
    // to make sure we always have an up-to-date one
    if (isMenuOpen) {
      dashboard
        .getAuthToken()
        .then(setAuthTokenOrError)
        .catch(error => {
          console.warn('An error occurred while getting auth token', error);
          setAuthTokenOrError(error);
        });
    }

    // Discard previous token and error, just before trying to fetch a new one
    return () => setAuthTokenOrError(undefined);
  }, [dashboard, isMenuOpen]);

  return (
    <MenuItem label="Open dashboard" isDisabled={loading} onClick={onClick} />
  );
}

export default withServices(OpenDashboardMenuItem, [
  'dashboard',
  'toastMessenger',
]);
