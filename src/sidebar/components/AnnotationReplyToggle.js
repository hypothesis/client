import { createElement } from 'preact';
import propTypes from 'prop-types';

import Button from './Button';

/**
 * @typedef AnnotationReplyToggleProps
 * @prop {() => any} onToggleReplies
 * @prop {number} replyCount
 * @prop {boolean} threadIsCollapsed
 */

/**
 * Render a thread-card control to toggle (expand or collapse) all of this
 * thread's children.
 *
 * @param {AnnotationReplyToggleProps} props
 */
function AnnotationReplyToggle({
  onToggleReplies,
  replyCount,
  threadIsCollapsed,
}) {
  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  return (
    <Button
      className="Annotation__reply-toggle"
      onClick={onToggleReplies}
      buttonText={toggleText}
    />
  );
}

AnnotationReplyToggle.propTypes = {
  onToggleReplies: propTypes.func,
  replyCount: propTypes.number,
  threadIsCollapsed: propTypes.bool.isRequired,
};

export default AnnotationReplyToggle;
