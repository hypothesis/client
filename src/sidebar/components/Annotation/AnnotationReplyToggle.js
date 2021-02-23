import propTypes from 'prop-types';

import { LinkButton } from '../Buttons';

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

  return <LinkButton onClick={onToggleReplies}>{toggleText}</LinkButton>;
}

AnnotationReplyToggle.propTypes = {
  onToggleReplies: propTypes.func,
  replyCount: propTypes.number,
  threadIsCollapsed: propTypes.bool.isRequired,
};

export default AnnotationReplyToggle;
