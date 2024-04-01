import { Card, CardContent } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import debounce from 'lodash.debounce';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'preact/hooks';

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
  // Test seams
  setTimeout_?: typeof setTimeout;
};

/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 */
function ThreadCard({
  frameSync,
  thread,
  /* istanbul ignore next - test seam */
  setTimeout_ = setTimeout,
}: ThreadCardProps) {
  const store = useSidebarStore();
  const threadTag = thread.annotation?.$tag ?? null;
  const isHovered = !!(threadTag && store.isAnnotationHovered(threadTag));
  const setThreadHovered = useMemo(
    () =>
      debounce((ann: Annotation | null) => frameSync.hoverAnnotation(ann), 10),
    [frameSync],
  );

  const scrollToAnnotation = useCallback(
    (ann: Annotation) => {
      frameSync.scrollToAnnotation(ann);
    },
    [frameSync],
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

  // Spotlight card if the annotation is marked as "$spotlight"
  const [spotlight, setSpotlight] = useState(
    thread.annotation?.$spotlight ?? false,
  );
  useEffect(() => {
    if (thread.annotation?.$spotlight) {
      setSpotlight(true);
      setTimeout_(() => setSpotlight(false), 5000);
    }
  }, [setTimeout_, thread.annotation?.$spotlight]);

  return (
    <Card
      active={isHovered}
      classes={classnames(
        'cursor-pointer focus-visible-ring theme-clean:border-none',
        { 'border-brand': spotlight },
      )}
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
