import { Card, CardContent } from '@hypothesis/frontend-shared/lib/next';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import type { Annotation } from '../../types/api';

import type { Thread as IThread } from '../helpers/build-thread';
import type { FrameSyncService } from '../services/frame-sync';
import { useSidebarStore } from '../store';
import { withServices } from '../service-context';

import Thread from './Thread';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * @typedef ThreadCardProps
 * @prop {import('../helpers/build-thread').Thread} thread
 * @prop {import('../services/frame-sync').FrameSyncService} frameSync
 */

export type ThreadCardProps = {
  thread: IThread;

  // injected
  frameSync: FrameSyncService;
};
/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 */
function ThreadCard({ frameSync, thread }: ThreadCardProps) {
  const store = useSidebarStore();
  const threadTag = thread.annotation?.$tag ?? null;
  const isHovered = !!(threadTag && store.isAnnotationHovered(threadTag));
  const setThreadHovered = useMemo(
    () =>
      debounce((ann: Annotation | null) => frameSync.hoverAnnotation(ann), 10),
    [frameSync]
  );

  const scrollToAnnotation = useCallback(
    (ann: Annotation) => {
      frameSync.scrollToAnnotation(ann);
    },
    [frameSync]
  );

  /**
   * Is the target's event an <a> or <button> element, or does it have
   * either as an ancestor?
   *
   * @param {Element} target
   */
  const isFromButtonOrLink = (target: Element) => {
    return !!target.closest('button') || !!target.closest('a');
  };

  // Memoize threads to reduce avoid re-rendering when something changes in a
  // parent component but the `Thread` itself has not changed.
  const threadContent = useMemo(() => <Thread thread={thread} />, [thread]);

  // Handle requests to give this thread keyboard focus.
  const focusRequest = store.annotationFocusRequest();
  const cardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (focusRequest !== thread.id || !cardRef.current) {
      return;
    }
    cardRef.current.focus();
    store.clearAnnotationFocusRequest();
  }, [focusRequest, store, thread.id]);

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <Card
      active={isHovered}
      classes="cursor-pointer focus-visible-ring theme-clean:border-none"
      data-testid="thread-card"
      elementRef={cardRef}
      tabIndex={-1}
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (!isFromButtonOrLink(e.target as Element) && thread.annotation) {
          scrollToAnnotation(thread.annotation);
        }
      }}
      onMouseEnter={() => setThreadHovered(thread.annotation ?? null)}
      onMouseLeave={() => setThreadHovered(null)}
      key={thread.id}
    >
      <CardContent>{threadContent}</CardContent>
    </Card>
  );
}

export default withServices(ThreadCard, ['frameSync']);
