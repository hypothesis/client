import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';

import Button from './button';

/**
 * @typedef {import("../../types/api").Annotation} Annotation
 */

/**
 * @typedef AnnotationReplyToggleProps
 * @prop {string} threadId
 * @prop {boolean} threadIsCollapsed
 * @prop {number} replyCount
 */

/**
 * Render a thread-card control to toggle (expand or collapse) all of this
 * thread's children.
 *
 * @param {AnnotationReplyToggleProps} props
 */
function AnnotationReplyToggle({ threadId, threadIsCollapsed, replyCount }) {
  const store = useStoreProxy();
  const hasAppliedFilter = store.hasAppliedFilter();

  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  const onToggleReplies = () =>
    store.setExpanded(/** @type {string} */ (threadId), !!threadIsCollapsed);

  // Do not show the reply toggle if there is filtering going on, or if
  // there are no replies to toggle.
  if (hasAppliedFilter || replyCount < 1) {
    return null;
  }

  return (
    <Button
      className="annotation__reply-toggle"
      onClick={onToggleReplies}
      buttonText={toggleText}
    />
  );
}

AnnotationReplyToggle.propTypes = {
  threadId: propTypes.string.isRequired,
  threadIsCollapsed: propTypes.bool.isRequired,
  replyCount: propTypes.number,
};

export default AnnotationReplyToggle;
