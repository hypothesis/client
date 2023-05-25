import {
  Button,
  CaretRightIcon,
  MenuExpandIcon,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useMemo } from 'preact/hooks';

import type { Thread as IThread } from '../helpers/build-thread';
import { countHidden, countVisible } from '../helpers/thread';
import { withServices } from '../service-context';
import type { ThreadsService } from '../services/threads';
import { useSidebarStore } from '../store';
import Annotation from './Annotation';
import AnnotationHeader from './Annotation/AnnotationHeader';
import EmptyAnnotation from './Annotation/EmptyAnnotation';
import ModerationBanner from './ModerationBanner';

type ThreadCollapseControlProps = {
  threadIsCollapsed: boolean;
  onToggleReplies: () => void;
};

/**
 * Render a gutter area to the left of a thread's content with a control for
 * expanding/collapsing the thread and a visual vertical line showing the
 * extent of the thread.
 */
function ThreadCollapseControl({
  threadIsCollapsed,
  onToggleReplies,
}: ThreadCollapseControlProps) {
  const ToggleIcon = threadIsCollapsed ? CaretRightIcon : MenuExpandIcon;
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
        <Button
          classes={classnames(
            // Pull the button up a little to align horizontally with the
            // thread/annotation's header. Override large touch targets for
            // touch interfaces; we need to conserve space here
            '-mt-1 touch:min-w-[auto] touch:min-h-[auto] p-[6.5px]',
            'text-grey-5 hover:text-grey-7'
          )}
          data-testid="toggle-button"
          expanded={!threadIsCollapsed}
          title={toggleTitle}
          onClick={onToggleReplies}
          size="custom"
          variant="custom"
        >
          <ToggleIcon className="w-em h-em" />
        </Button>
      </div>
    </div>
  );
}

export type ThreadProps = {
  thread: IThread;

  // injected
  threadsService: ThreadsService;
};

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
 */
function Thread({ thread, threadsService }: ThreadProps) {
  const isReply = !!thread.parent;

  // If rendering child threads, only render those that have at least one
  // visible item within them—i.e. don't render empty/totally-hidden threads.
  const visibleChildren = thread.children.filter(
    child => countVisible(child) > 0
  );

  const store = useSidebarStore();
  const hasAppliedFilter = store.hasAppliedFilter();
  const isSaving =
    thread.annotation && store.isSavingAnnotation(thread.annotation);
  const isEditing =
    thread.annotation && !!store.getDraft(thread.annotation) && !isSaving;

  const onToggleReplies = useCallback(
    () => store.setExpanded(thread.id, !!thread.collapsed),
    [store, thread.id, thread.collapsed]
  );

  const showReplyToggle =
    !isReply && !isEditing && !hasAppliedFilter && thread.replyCount > 0;

  // Memoize annotation content to avoid re-rendering an annotation when content
  // in other annotations/threads change.
  const annotationContent = useMemo(
    () =>
      thread.visible && (
        <>
          {thread.annotation ? (
            <>
              <ModerationBanner annotation={thread.annotation} />
              <Annotation
                annotation={thread.annotation}
                isReply={isReply}
                onToggleReplies={showReplyToggle ? onToggleReplies : undefined}
                replyCount={thread.replyCount}
                threadIsCollapsed={thread.collapsed}
              />
            </>
          ) : (
            <EmptyAnnotation
              isReply={isReply}
              onToggleReplies={showReplyToggle ? onToggleReplies : undefined}
              replyCount={thread.replyCount}
              threadIsCollapsed={thread.collapsed}
            />
          )}
        </>
      ),
    [
      isReply,
      onToggleReplies,
      showReplyToggle,
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
            {
              // Every ThreadCard should have a header of some sort representing
              // its top-level thread. When a thread is visible, an Annotation
              // is rendered which in turn renders an AnnotationHeader. But when
              // a thread is hidden, Annotation is not rendered: reander a header
              // here instead for hidden top-level threads.
            }
            {!thread.parent && thread.annotation && (
              <AnnotationHeader
                annotation={thread.annotation}
                isEditing={isEditing}
                replyCount={thread.replyCount}
                threadIsCollapsed={thread.collapsed}
              />
            )}
            <div>
              <Button
                data-testid="show-hidden-button"
                onClick={() => threadsService.forceVisible(thread)}
              >
                Show {countHidden(thread)} more in conversation
              </Button>
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
              <li
                key={child.id}
                className={classnames(
                  'mt-2',
                  // Ensure correct rendering of replies with RTL content.
                  // See https://github.com/hypothesis/client/issues/4705.
                  '[text-align:start]'
                )}
              >
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
