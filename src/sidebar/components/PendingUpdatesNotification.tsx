import { Button, DownloadIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { pluralize } from '../../shared/pluralize';
import { useShortcut } from '../../shared/shortcut';
import { withServices } from '../service-context';
import type { AnalyticsService } from '../services/analytics';
import type { StreamerService } from '../services/streamer';
import { useSidebarStore } from '../store';

export type PendingUpdatesNotificationProps = {
  // Injected
  streamer: StreamerService;
  analytics: AnalyticsService;

  // Test seams
  setTimeout_?: typeof setTimeout;
  clearTimeout_?: typeof clearTimeout;
};

type HideableBlockProps = {
  hidden: boolean;
  children: ComponentChildren;
};

/**
 * A component that can be hidden but will be unconditionally displayed when the
 * group it belongs to is focused or hovered
 */
function HideableBlock({ hidden, children }: HideableBlockProps) {
  return (
    <span
      className={classnames('group-hover:inline group-focus:inline', {
        hidden,
      })}
    >
      {children}
    </span>
  );
}

const collapseDelay = 5000;

function PendingUpdatesNotification({
  streamer,
  analytics,
  /* istanbul ignore next - test seam */
  setTimeout_ = setTimeout,
  /* istanbul ignore next - test seam */
  clearTimeout_ = clearTimeout,
}: PendingUpdatesNotificationProps) {
  const store = useSidebarStore();
  const pendingUpdateCount = store.pendingUpdateCount();
  const hasPendingChanges = store.hasPendingUpdatesOrDeletions();
  const applyPendingUpdates = useCallback(() => {
    streamer.applyPendingUpdates();
    analytics.trackEvent('client.realtime.apply_updates');
  }, [analytics, streamer]);
  const [collapsed, setCollapsed] = useState(false);
  const timeout = useRef<number | null>(null);

  useShortcut('l', () => hasPendingChanges && applyPendingUpdates());

  useEffect(() => {
    if (hasPendingChanges) {
      timeout.current = setTimeout_(() => {
        setCollapsed(true);
        timeout.current = null;
      }, collapseDelay);
    } else {
      setCollapsed(false);
    }

    return () => timeout.current && clearTimeout_(timeout.current);
  }, [clearTimeout_, hasPendingChanges, setTimeout_]);

  if (!hasPendingChanges) {
    return null;
  }

  return (
    <div
      role="status"
      className="absolute right-0 animate-updates-notification-slide-in"
    >
      <Button
        onClick={applyPendingUpdates}
        unstyled
        classes={classnames(
          'flex gap-1.5 items-center py-1 px-2',
          'rounded shadow-lg bg-gray-900 text-white',
          'group focus-visible-ring',
        )}
      >
        <DownloadIcon className="w-em h-em opacity-80" />
        <div
          data-testid={
            collapsed ? 'collapsed-notification' : 'full-notification'
          }
          className="flex gap-1"
        >
          <HideableBlock hidden={collapsed}>Load</HideableBlock>
          <span className="font-bold">{pendingUpdateCount}</span>
          <HideableBlock hidden={collapsed}>
            {pluralize(pendingUpdateCount, 'update', 'updates')}
          </HideableBlock>
        </div>
        <span className="sr-only">by pressing l</span>
      </Button>
    </div>
  );
}

export default withServices(PendingUpdatesNotification, [
  'streamer',
  'analytics',
]);
