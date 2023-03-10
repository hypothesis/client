import { IconButton, RefreshIcon } from '@hypothesis/frontend-shared/lib/next';
import { useEffect } from 'preact/hooks';

import { withServices } from '../service-context';
import type { StreamerService } from '../services/streamer';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type PendingUpdatesButtonProps = {
  // Injected
  streamer: StreamerService;
  toastMessenger: ToastMessengerService;
};

function PendingUpdatesButton({
  streamer,
  toastMessenger,
}: PendingUpdatesButtonProps) {
  const store = useSidebarStore();
  const pendingUpdateCount = store.pendingUpdateCount();
  const hasPendingUpdates = store.hasPendingUpdates();

  useEffect(() => {
    if (hasPendingUpdates) {
      toastMessenger.notice(`New annotations are available.`, {
        visuallyHidden: true,
      });
    }
  }, [hasPendingUpdates, toastMessenger]);

  if (!hasPendingUpdates) {
    return null;
  }

  return (
    <IconButton
      icon={RefreshIcon}
      onClick={() => streamer.applyPendingUpdates()}
      size="xs"
      variant="primary"
      title={`Show ${pendingUpdateCount} new/updated ${
        pendingUpdateCount === 1 ? 'annotation' : 'annotations'
      }`}
    />
  );
}

export default withServices(PendingUpdatesButton, [
  'streamer',
  'toastMessenger',
]);
