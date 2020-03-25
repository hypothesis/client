import classnames from 'classnames';
import { createElement, Fragment } from 'preact';

import propTypes from 'prop-types';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';
import { countHidden, countVisible } from '../util/thread';

import Annotation from './annotation';
import Button from './button';
import ModerationBanner from './moderation-banner';

/**
 * A thread, which contains a single annotation at its top level, and its
 * recursively-rendered children (i.e. replies). A thread may have a parent,
 * and at any given time it may be `collapsed`.
 */
function Thread({ showDocumentInfo = false, thread, threadsService }) {
  const setCollapsed = useStore(store => store.setCollapsed);

  // Only render this thread's annotation if it exists and the thread is `visible`
  const showAnnotation = thread.annotation && thread.visible;

  // Render this thread's replies only if the thread is expanded
  const showChildren = !thread.collapsed;

  // Applied search filters will "hide" non-matching threads. If there are
  // hidden items within this thread, provide a control to un-hide them.
  const showHiddenToggle = countHidden(thread) > 0;

  // Render a control to expand/collapse the current thread if this thread has
  // a parent (i.e. is a reply thread)
  const showThreadToggle = !!thread.parent;
  const toggleIcon = thread.collapsed ? 'caret-right' : 'expand-menu';
  const toggleTitle = thread.collapsed ? 'Expand replies' : 'Collapse replies';

  // If rendering child threads, only render those that have at least one
  // visible item within them—i.e. don't render empty/totally-hidden threads.
  const visibleChildren = thread.children.filter(
    child => countVisible(child) > 0
  );

  const onToggleReplies = () => setCollapsed(thread.id, !thread.collapsed);
  return (
    <div
      className={classnames('thread', {
        'thread--reply': thread.depth > 0,
        'thread--top-reply': thread.depth === 1,
        'is-collapsed': thread.collapsed,
      })}
    >
      {showThreadToggle && (
        <div className="thread__collapse">
          <Button
            className="thread__collapse-button"
            icon={toggleIcon}
            title={toggleTitle}
            onClick={onToggleReplies}
          />
        </div>
      )}

      <div className="thread__content">
        {showAnnotation && (
          <Fragment>
            <ModerationBanner annotation={thread.annotation} />
            <Annotation
              annotation={thread.annotation}
              replyCount={thread.replyCount}
              onReplyCountClick={onToggleReplies}
              showDocumentInfo={showDocumentInfo}
              threadIsCollapsed={thread.collapsed}
            />
          </Fragment>
        )}

        {!thread.annotation && (
          <div>
            <p>
              <em>Message not available.</em>
            </p>
          </div>
        )}

        {showHiddenToggle && (
          <Button
            buttonText={`Show ${countHidden(thread)} more in conversation`}
            onClick={() => threadsService.forceVisible(thread)}
          />
        )}

        {showChildren && (
          <ul>
            {visibleChildren.map(child => (
              <li key={child.annotation.$tag}>
                <Thread thread={child} threadsService={threadsService} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
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
