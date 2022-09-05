import { Card } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import debounce from 'lodash.debounce';
import { useCallback, useMemo } from 'preact/hooks';

import { useSidebarStore } from '../store';
import { withServices } from '../service-context';

import Thread from './Thread';

/**
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * @typedef ThreadCardProps
 * @prop {import('../helpers/build-thread').Thread} thread
 * @prop {import('../services/frame-sync').FrameSyncService} frameSync
 */

/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 *
 * @param {ThreadCardProps} props
 */
function ThreadCard({ frameSync, thread }) {
  const store = useSidebarStore();
  const threadTag = thread.annotation?.$tag ?? null;
  const isHovered = threadTag && store.isAnnotationHovered(threadTag);
  const focusThreadAnnotation = useMemo(
    () =>
      debounce(
        /** @param {string|null} tag */
        tag => {
          const focusTags = tag ? [tag] : [];
          frameSync.hoverAnnotations(focusTags);
        },
        10
      ),
    [frameSync]
  );

  const scrollToAnnotation = useCallback(
    /** @param {string} tag */
    tag => {
      frameSync.scrollToAnnotation(tag);
    },
    [frameSync]
  );

  /**
   * Is the target's event an <a> or <button> element, or does it have
   * either as an ancestor?
   *
   * @param {Element} target
   */
  const isFromButtonOrLink = target => {
    return !!target.closest('button') || !!target.closest('a');
  };

  // Memoize threads to reduce avoid re-rendering when something changes in a
  // parent component but the `Thread` itself has not changed.
  const threadContent = useMemo(() => <Thread thread={thread} />, [thread]);

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <Card
      classes={classnames('p-3 cursor-pointer', {
        'is-hovered': isHovered,
      })}
      data-testid="thread-card"
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (
          !isFromButtonOrLink(/** @type {Element} */ (e.target)) &&
          threadTag
        ) {
          scrollToAnnotation(threadTag);
        }
      }}
      onMouseEnter={() => focusThreadAnnotation(threadTag ?? null)}
      onMouseLeave={() => focusThreadAnnotation(null)}
      key={thread.id}
    >
      {threadContent}
    </Card>
  );
}

export default withServices(ThreadCard, ['frameSync']);
