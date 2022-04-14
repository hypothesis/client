import { IconButton, LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useMemo } from 'preact/hooks';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';
import { countHidden, countVisible } from '../helpers/thread';

import Annotation from './Annotation';
import AnnotationHeader from './Annotation/AnnotationHeader';
import ModerationBanner from './ModerationBanner';

/** @typedef {import('../helpers/build-thread').Thread} Thread */

/**
 * Render a header for a hidden top-level thread.
 *
 * Every ThreadCard should have a header of some sort representing its top-level
 * thread. When a thread is visible, an Annotation is rendered which in turn
 * renders an AnnotationHeader. But when a thread is hidden, Annotation is not
 * rendered: use this header instead for hidden top-level threads.
 *
 * @param {object} props
 *   @param {Thread['annotation']} props.annotation
 *   @param {number} props.replyCount
 *   @param {boolean} props.threadIsCollapsed
 */
function HiddenThreadCardHeader({ annotation, ...restProps }) {
  const store = useStoreProxy();

  // These two lines are copied from the AnnotationHeader component to mimic the
  // exact same behaviour.
  const isSaving = annotation && store.isSavingAnnotation(annotation);
  const isEditing = annotation && !!store.getDraft(annotation) && !isSaving;

  if (!annotation) {
    return null;
  }

  return (
    <AnnotationHeader
      annotation={annotation}
      isEditing={isEditing}
      {...restProps}
    />
  );
}

/**
 * Render a gutter area to the left of a thread's content with a control for
 * expanding/collapsing the thread and a visual vertical line showing the
 * extent of the thread.
 *
 * @param {object} props
 *   @param {boolean} props.threadIsCollapsed
 *   @param {() => void} props.onToggleReplies
 */
function ThreadCollapseControl({ threadIsCollapsed, onToggleReplies }) {
  const toggleIcon = threadIsCollapsed ? 'collapsed' : 'expand-menu';
  const toggleTitle = threadIsCollapsed ? 'Expand replies' : 'Collapse replies';
  return (
    <div
      className={classnames(
        // ThreadCards set a pointer cursor. Set cursor to auto so that
        // hovering over non-clickable parts of this gutter area do not show a
        // pointer.
        'cursor-auto',
        {
          'bg-thread-line': !threadIsCollapsed,
        }
      )}
      data-testid="thread-collapse-channel"
    >
      <div
        className={classnames(
          // Set a background color so the dashed line in the background
          // doesn't show through the button
          'bg-white'
        )}
      >
        <IconButton
          classes={classnames(
            // Pull the button up a little to align horizontally with the
            // thread/annotation's header. Override large touch targets for
            // touch interfaces; we need to conserve space here
            '-mt-1 touch:min-w-[auto] touch:min-h-[auto]'
          )}
          expanded={!threadIsCollapsed}
          icon={toggleIcon}
          title={toggleTitle}
          onClick={onToggleReplies}
          size="medium"
          variant="light"
        />
      </div>
    </div>
  );
}

/**
 * @typedef ThreadProps
 * @prop {Thread} thread
 * @prop {import('../services/threads').ThreadsService} threadsService
 */

/**
 * A thread, which contains a single annotation at its top level, and its
 * recursively-rendered children (i.e. replies).
 *
 * - Threads with parents (replies) may be "collapsed". Top-level threads are
 *   never collapsed.
 * - Any thread may be "hidden" because it does not match current filters.
 *
 * Each reply thread renders as a two-column "row", with a control to toggle
 * the thread's collapsed state at left and the content for the thread and its
 * children to the right.
 *
 * Top-level threads do not render a collapse control, as they are not
 * collapsible.
 *
 * @param {ThreadProps} props
 */
function Thread({ thread, threadsService }) {
  const isReply = !!thread.parent;

  // If rendering child threads, only render those that have at least one
  // visible item within them—i.e. don't render empty/totally-hidden threads.
  const visibleChildren = thread.children.filter(
    child => countVisible(child) > 0
  );

  const store = useStoreProxy();
  const hasAppliedFilter = store.hasAppliedFilter();
  const onToggleReplies = useCallback(
    () => store.setExpanded(thread.id, !!thread.collapsed),
    [store, thread.id, thread.collapsed]
  );

  // Memoize annotation content to avoid re-rendering an annotation when content
  // in other annotations/threads change.
  const annotationContent = useMemo(
    () =>
      thread.visible && (
        <>
          {thread.annotation && (
            <ModerationBanner annotation={thread.annotation} />
          )}
          <Annotation
            annotation={thread.annotation}
            hasAppliedFilter={hasAppliedFilter}
            isReply={isReply}
            onToggleReplies={onToggleReplies}
            replyCount={thread.replyCount}
            threadIsCollapsed={thread.collapsed}
          />
        </>
      ),
    [
      hasAppliedFilter,
      isReply,
      onToggleReplies,
      thread.annotation,
      thread.replyCount,
      thread.collapsed,
      thread.visible,
    ]
  );

  return (
    <section className="flex" data-testid="thread-container">
      {isReply && (
        <ThreadCollapseControl
          threadIsCollapsed={thread.collapsed}
          onToggleReplies={onToggleReplies}
        />
      )}

      <div
        className={classnames(
          // Set a max-width to ensure that annotation content does not exceed
          // the width of the container
          'grow max-w-full'
        )}
        data-testid="thread-content"
      >
        {annotationContent}

        {countHidden(thread) > 0 && (
          <div className="space-y-2">
            {!thread.parent && (
              <HiddenThreadCardHeader
                annotation={thread.annotation}
                replyCount={thread.replyCount}
                threadIsCollapsed={thread.collapsed}
              />
            )}
            <div>
              <LabeledButton
                onClick={() => threadsService.forceVisible(thread)}
              >
                Show {countHidden(thread)} more in conversation
              </LabeledButton>
            </div>
          </div>
        )}

        {!thread.collapsed && (
          <ul
            className={classnames(
              // Pull this list to the left to bring it closer to the left edge
              // of the ThreadCard and give more space for nested replies' content
              '-ml-3'
            )}
            data-testid="thread-children"
          >
            {visibleChildren.map(child => (
              <li key={child.id} className="mt-2">
                <Thread thread={child} threadsService={threadsService} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default withServices(Thread, ['threadsService']);
