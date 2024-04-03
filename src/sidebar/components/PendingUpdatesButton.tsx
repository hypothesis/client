import { IconButton, RefreshIcon } from '@hypothesis/frontend-shared';
import { useCallback, useEffect } from 'preact/hooks';

import { useShortcut } from '../../shared/shortcut';
import { withServices } from '../service-context';
import type { AnalyticsService } from '../services/analytics';
import type { StreamerService } from '../services/streamer';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type PendingUpdatesButtonProps = {
  // Injected
  analytics: AnalyticsService;
  streamer: StreamerService;
  toastMessenger: ToastMessengerService;
};

function PendingUpdatesButton({
  analytics,
  streamer,
  toastMessenger,
}: PendingUpdatesButtonProps) {
  const store = useSidebarStore();
  const pendingUpdateCount = store.pendingUpdateCount();
  const hasPendingUpdates = store.hasPendingUpdates();
  const applyPendingUpdates = useCallback(() => {
    streamer.applyPendingUpdates();
    analytics.trackEvent('client.realtime.apply_updates');
  }, [analytics, streamer]);

  useShortcut('l', () => hasPendingUpdates && applyPendingUpdates());

  useEffect(() => {
    if (hasPendingUpdates) {
      toastMessenger.notice('New annotations are available.', {
        visuallyHidden: true,
      });
      toastMessenger.notice('Press "l" to load new annotations.', {
        visuallyHidden: true,
        delayed: true,
      });
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
  'analytics',
  'streamer',
  'toastMessenger',
]);
