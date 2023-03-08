import { IconButton, RefreshIcon } from '@hypothesis/frontend-shared/lib/next';
import { useEffect } from 'preact/hooks';

import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type PendingUpdatesButtonProps = {
  onClick: () => void;

  // Injected
  toastMessenger: ToastMessengerService;
};

function PendingUpdatesButton({
  onClick,
  toastMessenger,
}: PendingUpdatesButtonProps) {
  const store = useSidebarStore();
  const pendingUpdateCount = store.pendingUpdateCount();
  const hasPendingUpdates = store.hasPendingUpdates();

  useEffect(() => {
    if (hasPendingUpdates) {
      toastMessenger.success(
        `There are ${pendingUpdateCount} new annotations.`,
        {
          visuallyHidden: true,
        }
      );
    }
    // We only want this effect to trigger when changing from no-updates to at
    // least one update, not every time the amount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingUpdates]);

  if (!hasPendingUpdates) {
    return null;
  }

  return (
    <IconButton
      icon={RefreshIcon}
      onClick={onClick}
      size="xs"
      variant="primary"
      title={`Show ${pendingUpdateCount} new/updated ${
        pendingUpdateCount === 1 ? 'annotation' : 'annotations'
      }`}
    />
  );
}

export default withServices(PendingUpdatesButton, ['toastMessenger']);
