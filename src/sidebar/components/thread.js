import classnames from 'classnames';
import { createElement, Fragment } from 'preact';

import propTypes from 'prop-types';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';
import { countHidden, countVisible } from '../util/thread';

import Annotation from './annotation';
import Button from './button';
import ModerationBanner from './moderation-banner';

/** @typedef {import('../util/build-thread').Thread} Thread */

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
  const setExpanded = useStore(store => store.setExpanded);

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
  const toggleIcon = thread.collapsed ? 'collapsed' : 'expand-menu';
  const toggleTitle = thread.collapsed ? 'Expand replies' : 'Collapse replies';

  // If rendering child threads, only render those that have at least one
  // visible item within them—i.e. don't render empty/totally-hidden threads.
  const visibleChildren = thread.children.filter(
    child => countVisible(child) > 0
  );

  const onToggleReplies = () => setExpanded(thread.id, !!thread.collapsed);
  return (
    <section
      className={classnames('thread', {
        'thread--reply': thread.depth > 0,
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
              showDocumentInfo={showDocumentInfo}
              threadIsCollapsed={thread.collapsed}
            />
          </Fragment>
        )}

        {!thread.annotation && (
          <div className="thread__unavailable-message">
            <em>Message not available.</em>
          </div>
        )}

        {showHiddenToggle && (
          <Button
            buttonText={`Show ${countHidden(thread)} more in conversation`}
            className="thread__hidden-toggle-button"
            onClick={() => threadsService.forceVisible(thread)}
          />
        )}

        {showChildren && (
          <ul className="thread__children">
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
