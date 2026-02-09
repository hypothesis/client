import { Card, CardContent } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
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
    [frameSync],
  );
  const isHighlighted = store.isAnnotationHighlighted(thread.annotation);

  const scrollToAnnotation = useCallback(
    (ann: Annotation) => {
      frameSync.scrollToAnnotation(ann);
    },
    [frameSync],
  );

  const currentUserId = store.profile().userid;
  const annotationIsDeclined =
    thread.annotation?.moderation_status === 'DENIED' &&
    thread.annotation.user === currentUserId;

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

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) {
      return () => {};
    }

    const handleFocusIn = () => {
      setThreadHovered(thread.annotation ?? null);
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Only clear hover if focus is moving outside the card entirely
      // (not just to another element within the card)
      const relatedTarget = e.relatedTarget;

      // If relatedTarget is null, focus is leaving the document/frame entirely.
      // If relatedTarget exists but is not a Node or is not contained in the card,
      // treat it as moving focus outside the card.
      if (
        !relatedTarget ||
        !(relatedTarget instanceof Node) ||
        !cardElement.contains(relatedTarget)
      ) {
        setThreadHovered(null);
      }
      // If relatedTarget exists and is contained in the card, focus is moving
      // to another element within the card (e.g., from a button to a link),
      // so we keep the highlight active
    };

    cardElement.addEventListener('focusin', handleFocusIn);
    cardElement.addEventListener('focusout', handleFocusOut);

    return () => {
      cardElement.removeEventListener('focusin', handleFocusIn);
      cardElement.removeEventListener('focusout', handleFocusOut);
    };
  }, [setThreadHovered, thread.annotation]);

  return (
    <Card
      active={isHovered}
      classes={classnames(
        'cursor-pointer focus-visible-ring theme-clean:border-none',
        {
          'border-brand': isHighlighted,
          'border-red': !isHighlighted && annotationIsDeclined,
        },
      )}
      data-testid="thread-card"
      elementRef={cardRef}
      tabIndex={0}
      aria-description="Press Enter to scroll annotation into view"
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (!isFromButtonOrLink(e.target as Element) && thread.annotation) {
          scrollToAnnotation(thread.annotation);
        }
      }}
      onMouseEnter={() => setThreadHovered(thread.annotation ?? null)}
      onMouseLeave={() => setThreadHovered(null)}
      onKeyDown={e => {
        // Simulate default button behavior, where `Enter` and `Space` trigger
        // click action
        if (
          // Trigger event only if the target is the card itself, so that we do
          // not scroll to the annotation while editing it, or if the key is
          // pressed to interact with a child button or link.
          e.target === cardRef.current &&
          ['Enter', ' '].includes(e.key) &&
          thread.annotation
        ) {
          scrollToAnnotation(thread.annotation);
        }
      }}
      key={thread.id}
    >
      <CardContent>{threadContent}</CardContent>
    </Card>
  );
}

export default withServices(ThreadCard, ['frameSync']);
