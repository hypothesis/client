import classnames from 'classnames';
import { createElement, Fragment } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import propTypes from 'prop-types';
import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';
import { countHidden, countVisible } from '../helpers/thread';

import Annotation from './Annotation';
import AnnotationMissing from './AnnotationMissing';
import Button from './Button';
import ModerationBanner from './ModerationBanner';

/** @typedef {import('../helpers/build-thread').Thread} Thread */

/**
 * @typedef ThreadProps
 * @prop {boolean} [showDocumentInfo]
 * @prop {Thread} thread
 * @prop {Object} threadsService - Injected service
 */

/**
 * A thread, which contains a single annotation at its top level, and its
 * recursively-rendered children (i.e. replies). A thread may have a parent,
 * and at any given time it may be `collapsed`.
 *
 * @param {ThreadProps} props
 */
function Thread({ showDocumentInfo = false, thread, threadsService }) {
  // Only render this thread's annotation if it exists and the thread is `visible`
  const showAnnotation = thread.annotation && thread.visible;
  const showMissingAnnotation = thread.visible && !thread.annotation;

  // Render this thread's replies only if the thread is expanded
  const showChildren = !thread.collapsed;

  // Applied search filters will "hide" non-matching threads. If there are
  // hidden items within this thread, provide a control to un-hide them.
  const showHiddenToggle = countHidden(thread) > 0;

  // Render a control to expand/collapse the current thread if this thread has
  // a parent (i.e. is a reply thread)
  const showThreadToggle = !!thread.parent;
  const toggleIcon = thread.collapsed ? 'collapsed' : 'expand-menu';
  const toggleTitle = thread.collapsed ? 'Expand replies' : 'Collapse replies';

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
  const annotationContent = useMemo(() => {
    if (showAnnotation) {
      return (
        <Fragment>
          <ModerationBanner annotation={thread.annotation} />
          <Annotation
            annotation={thread.annotation}
            hasAppliedFilter={hasAppliedFilter}
            isReply={!!thread.parent}
            onToggleReplies={onToggleReplies}
            replyCount={thread.replyCount}
            showDocumentInfo={showDocumentInfo}
            threadIsCollapsed={thread.collapsed}
          />
        </Fragment>
      );
    } else if (showMissingAnnotation) {
      return (
        <AnnotationMissing
          hasAppliedFilter={hasAppliedFilter}
          isReply={!!thread.parent}
          onToggleReplies={onToggleReplies}
          replyCount={thread.replyCount}
          threadIsCollapsed={thread.collapsed}
        />
      );
    } else {
      return null;
    }
  }, [
    hasAppliedFilter,
    onToggleReplies,
    showAnnotation,
    showMissingAnnotation,
    showDocumentInfo,
    thread.annotation,
    thread.parent,
    thread.replyCount,
    thread.collapsed,
  ]);

  return (
    <section
      className={classnames('Thread', {
        'Thread--reply': thread.depth > 0,
        'is-collapsed': thread.collapsed,
      })}
    >
      {showThreadToggle && (
        <div className="Thread__collapse">
          <Button
            className="Thread__collapse-button"
            icon={toggleIcon}
            title={toggleTitle}
            onClick={onToggleReplies}
          />
        </div>
      )}

      <div className="Thread__content">
        {annotationContent}

        {showHiddenToggle && (
          <Button
            buttonText={`Show ${countHidden(thread)} more in conversation`}
            className="Thread__hidden-toggle-button"
            onClick={() => threadsService.forceVisible(thread)}
          />
        )}

        {showChildren && (
          <ul className="Thread__children">
            {visibleChildren.map(child => (
              <li key={child.id}>
                <Thread thread={child} threadsService={threadsService} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

Thread.propTypes = {
  showDocumentInfo: propTypes.bool,
  thread: propTypes.object.isRequired,

  // Injected
  threadsService: propTypes.object.isRequired,
};

Thread.injectedProps = ['threadsService'];

export default withServices(Thread);
