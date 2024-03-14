import { Button, RefreshIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { useShortcut } from '../../shared/shortcut';
import { withServices } from '../service-context';
import type { StreamerService } from '../services/streamer';
import { useSidebarStore } from '../store';

export type PendingUpdatesNotificationProps = {
  // Injected
  streamer: StreamerService;

  // Test seams
  setTimeout_?: typeof setTimeout;
  clearTimeout_?: typeof clearTimeout;
};

const collapseDelay = 5000;

function PendingUpdatesNotification({
  streamer,
  /* istanbul ignore next - test seam */
  setTimeout_ = setTimeout,
  /* istanbul ignore next - test seam */
  clearTimeout_ = clearTimeout,
}: PendingUpdatesNotificationProps) {
  const store = useSidebarStore();
  const pendingUpdateCount = store.pendingUpdateCount();
  const hasPendingUpdates = store.hasPendingUpdates();
  const applyPendingUpdates = useCallback(
    () => streamer.applyPendingUpdates(),
    [streamer],
  );
  const [collapsed, setCollapsed] = useState(false);
  const timeout = useRef<number | null>(null);

  useShortcut('l', () => hasPendingUpdates && applyPendingUpdates());

  useEffect(() => {
    if (hasPendingUpdates) {
      timeout.current = setTimeout_(() => {
        setCollapsed(true);
        timeout.current = null;
      }, collapseDelay);
    } else {
      setCollapsed(false);
    }

    return () => timeout.current && clearTimeout_(timeout.current);
  }, [clearTimeout_, hasPendingUpdates, setTimeout_]);

  if (!hasPendingUpdates) {
    return null;
  }

  return (
    <div role="status" className="animate-fade-in">
      <Button
        onClick={applyPendingUpdates}
        unstyled
        classes={classnames(
          'flex gap-1.5 items-center py-1 px-2',
          'rounded shadow-lg bg-gray-900 text-white',
        )}
        onMouseEnter={() => setCollapsed(false)}
        onFocus={() => setCollapsed(false)}
        onMouseLeave={() => !timeout.current && setCollapsed(true)}
        onBlur={() => !timeout.current && setCollapsed(true)}
      >
        <RefreshIcon />
        {!collapsed && (
          <span data-testid="full-notification">
            Load <span className="font-bold">{pendingUpdateCount}</span> updates{' '}
            <span className="sr-only">by pressing l</span>
          </span>
        )}
        {collapsed && (
          <span data-testid="collapsed-notification" className="font-bold">
            {pendingUpdateCount}
          </span>
        )}
      </Button>
    </div>
  );
}

export default withServices(PendingUpdatesNotification, ['streamer']);
