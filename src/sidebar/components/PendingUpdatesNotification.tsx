import { Button, DownloadIcon, MentionIcon } from '@hypothesis/frontend-shared';
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

type UpdateBlockProps = {
  type: 'updates' | 'mentions';
  collapsed: boolean;
  count: number;
};

function UpdateBlock({ type, collapsed, count }: UpdateBlockProps) {
  const singular = type === 'updates' ? 'update' : 'mention';
  const plural = type === 'updates' ? 'updates' : 'mentions';
  const Icon = type === 'updates' ? DownloadIcon : MentionIcon;

  return (
    <div
      className={classnames(
        'flex gap-1.5 items-center px-2 py-1',
        'border-l first:border-l-0 border-white/60',
      )}
    >
      <Icon className="w-em h-em" />
      <div className="flex gap-1">
        <span className="font-bold">{count}</span>
        <HideableBlock hidden={collapsed}>
          {pluralize(count, singular, plural)}
        </HideableBlock>
      </div>
    </div>
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
  const pendingMentionCount = store.pendingMentionCount();
  const mentionsEnabled = store.isFeatureEnabled('at_mentions');
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
          'flex items-center',
          'rounded shadow-lg bg-gray-900 text-white',
          'group focus-visible-ring',
        )}
        data-testid="notification"
        data-collapsed={collapsed}
      >
        <UpdateBlock
          type="updates"
          collapsed={collapsed}
          count={pendingUpdateCount}
        />
        {mentionsEnabled && pendingMentionCount > 0 && (
          <UpdateBlock
            type="mentions"
            collapsed={collapsed}
            count={pendingMentionCount}
          />
        )}
        <span className="sr-only">load them by pressing l</span>
      </Button>
    </div>
  );
}

export default withServices(PendingUpdatesNotification, [
  'streamer',
  'analytics',
]);
