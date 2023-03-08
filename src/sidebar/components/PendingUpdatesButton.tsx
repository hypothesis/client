import { IconButton, RefreshIcon } from '@hypothesis/frontend-shared/lib/next';
import { useEffect } from 'preact/hooks';

import { withServices } from '../service-context';
import type { ToastMessengerService } from '../services/toast-messenger';

export type PendingUpdatesButtonProps = {
  pendingUpdateCount: number;
  onClick: () => void;

  // Injected
  toastMessenger: ToastMessengerService;
};

function PendingUpdatesButton({
  pendingUpdateCount,
  onClick,
  toastMessenger,
}: PendingUpdatesButtonProps) {
  useEffect(() => {
    if (pendingUpdateCount > 0) {
      toastMessenger.success(
        `There are ${pendingUpdateCount} new annotations.`,
        {
          visuallyHidden: true,
        }
      );
    }
  }, [pendingUpdateCount, toastMessenger]);

  if (pendingUpdateCount === 0) {
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
