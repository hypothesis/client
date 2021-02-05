import classnames from 'classnames';
import propTypes from 'prop-types';

import AnnotationReplyToggle from './AnnotationReplyToggle';

/** @typedef {import('./Annotation').AnnotationProps} AnnotationProps */

/**
 * @typedef {Omit<AnnotationProps, 'annotation'|'showDocumentInfo'|'annotationsService'>} AnnotationMissingProps
 */

/**
 * Renders in place of an annotation if a thread's annotation is missing.
 *
 * @param {AnnotationMissingProps} props
 */
function AnnotationMissing({
  hasAppliedFilter,
  isReply,
  onToggleReplies,
  replyCount,
  threadIsCollapsed,
}) {
  const showReplyToggle = !isReply && !hasAppliedFilter && replyCount > 0;
  const isCollapsedReply = isReply && threadIsCollapsed;

  return (
    <article
      className={classnames('Annotation', 'Annotation--missing', {
        'is-collapsed': threadIsCollapsed,
      })}
    >
      {!isCollapsedReply && (
        <div>
          <em>Message not available.</em>
        </div>
      )}

      {!isCollapsedReply && (
        <footer className="Annotation__footer">
          <div className="Annotation__controls u-layout-row">
            {showReplyToggle && (
              <AnnotationReplyToggle
                onToggleReplies={onToggleReplies}
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
  hasAppliedFilter: propTypes.bool,
  isReply: propTypes.bool.isRequired,
  onToggleReplies: propTypes.func,
  replyCount: propTypes.number.isRequired,
  threadIsCollapsed: propTypes.bool,
};

export default AnnotationMissing;
