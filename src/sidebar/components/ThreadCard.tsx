import { ButtonBase, Card, CardContent } from '@hypothesis/frontend-shared';
import debounce from 'lodash.debounce';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import type { Annotation } from '../../types/api';
import type { Thread as IThread } from '../helpers/build-thread';
import { withServices } from '../service-context';
import type { FrameSyncService } from '../services/frame-sync';
import { useSidebarStore } from '../store';
import Thread from './Thread';

export type ThreadCardProps = {
  thread: IThread;

  // injected
  frameSync: FrameSyncService;
};

/**
 * A "top-level" `Thread`, rendered as a "card" wrapped in a "button" (for a11y).
 * A `Thread` renders its own child `Thread`s within itself.
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
  const threadRef = useRef<HTMLElement | null>(null);

  /**
   * Is the target's event an <a> or a <button> other than the thread itself, or
   * does it have either as an ancestor?
   *
   * @param {Element} target
   */
  const isFromChildButtonOrLink = (target: Element) => {
    return (
      target.closest('button') !== threadRef.current || !!target.closest('a')
    );
  };

  // Memoize threads to reduce avoid re-rendering when something changes in a
  // parent component but the `Thread` itself has not changed.
  const threadContent = useMemo(() => <Thread thread={thread} />, [thread]);

  // Handle requests to give this thread keyboard focus.
  const focusRequest = store.annotationFocusRequest();
  useEffect(() => {
    if (focusRequest !== thread.id || !threadRef.current) {
      return;
    }
    threadRef.current.focus();
    store.clearAnnotationFocusRequest();
  }, [focusRequest, store, thread.id]);

  return (
    <ButtonBase
      unstyled
      classes="focus-visible-ring text-left w-full"
      elementRef={threadRef}
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (
          !isFromChildButtonOrLink(e.target as Element) &&
          thread.annotation
        ) {
          scrollToAnnotation(thread.annotation);
        }
      }}
      onMouseEnter={() => setThreadHovered(thread.annotation ?? null)}
      onMouseLeave={() => setThreadHovered(null)}
      key={thread.id}
    >
      <Card
        active={isHovered}
        classes="theme-clean:border-none"
        data-testid="thread-card"
      >
        <CardContent>{threadContent}</CardContent>
      </Card>
    </ButtonBase>
  );
}

export default withServices(ThreadCard, ['frameSync']);
