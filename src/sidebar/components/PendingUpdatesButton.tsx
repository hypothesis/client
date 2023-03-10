import { IconButton, RefreshIcon } from '@hypothesis/frontend-shared/lib/next';
import { useEffect } from 'preact/hooks';

import { useGlobalShortcut } from '../../shared/shortcut';
import { withServices } from '../service-context';
import type { FrameSyncService } from '../services/frame-sync';
import type { StreamerService } from '../services/streamer';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type PendingUpdatesButtonProps = {
  // Injected
  frameSync: FrameSyncService;
  streamer: StreamerService;
  toastMessenger: ToastMessengerService;
};

function PendingUpdatesButton({
  frameSync,
  streamer,
  toastMessenger,
}: PendingUpdatesButtonProps) {
  const store = useSidebarStore();
  const pendingUpdateCount = store.pendingUpdateCount();
  const hasPendingUpdates = store.hasPendingUpdates();
  const applyPendingUpdates = () => streamer.applyPendingUpdates();

  useGlobalShortcut({
    shortcut: '.',
    onPress: () => hasPendingUpdates && applyPendingUpdates(),
    frameSync,
  });

  useEffect(() => {
    if (hasPendingUpdates) {
      toastMessenger.notice(
        `New annotations are available. Press "." to load them.`,
        {
          visuallyHidden: true,
        }
      );
    }
  }, [hasPendingUpdates, toastMessenger]);

  if (!hasPendingUpdates) {
    return null;
  }

  return (
    <IconButton
      icon={RefreshIcon}
      onClick={applyPendingUpdates}
      size="xs"
      variant="primary"
      title={`Show ${pendingUpdateCount} new/updated ${
        pendingUpdateCount === 1 ? 'annotation' : 'annotations'
      }`}
    />
  );
}

export default withServices(PendingUpdatesButton, [
  'frameSync',
  'streamer',
  'toastMessenger',
]);
