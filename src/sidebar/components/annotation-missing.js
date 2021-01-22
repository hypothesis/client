import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import AnnotationReplyToggle from './annotation-reply-toggle';

/**
 * @typedef AnnotationMissingProps
 * @prop {string} threadId
 * @prop {boolean} isReply
 * @prop {number} replyCount
 * @prop {boolean} threadIsCollapsed
 */

/**
 * Renders in place of an annotation if a thread's annotation is missing.
 *
 * @param {AnnotationMissingProps} props
 */
function AnnotationMissing({
  isReply,
  threadId,
  replyCount,
  threadIsCollapsed,
}) {
  const shouldShowReplyToggle = !isReply;
  const isCollapsedReply = isReply && threadIsCollapsed;

  return (
    <article
      className={classnames('annotation', 'annotation--missing', {
        'is-collapsed': threadIsCollapsed,
      })}
    >
      {!isCollapsedReply && (
        <div>
          <em>Message not available.</em>
        </div>
      )}

      {!isCollapsedReply && (
        <footer className="annotation__footer">
          <div className="annotation__controls u-layout-row">
            {shouldShowReplyToggle && (
              <AnnotationReplyToggle
                threadId={threadId}
                replyCount={replyCount}
                threadIsCollapsed={threadIsCollapsed}
              />
            )}
          </div>
        </footer>
      )}
    </article>
  );
}

AnnotationMissing.propTypes = {
  isReply: propTypes.bool.isRequired,
  replyCount: propTypes.number.isRequired,
  threadIsCollapsed: propTypes.bool,
  threadId: propTypes.string.isRequired,
};

export default AnnotationMissing;
