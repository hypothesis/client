import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import { quote } from '../helpers/annotation-metadata';
import { withServices } from '../service-context';

import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';
import AnnotationReplyToggle from './AnnotationReplyToggle';

/**
 * @typedef {import("../../types/api").Annotation} Annotation
 * @typedef {import('../../types/api').Group} Group
 */

/**
 * @typedef AnnotationProps
 * @prop {Annotation} annotation
 * @prop {boolean} hasAppliedFilter - Is any filter applied currently?
 * @prop {boolean} isReply
 * @prop {VoidFunction} onToggleReplies - Callback to expand/collapse reply threads
 * @prop {number} replyCount - Number of replies to this annotation's thread
 * @prop {boolean} showDocumentInfo - Should extended document info be rendered (e.g. in non-sidebar contexts)?
 * @prop {boolean} threadIsCollapsed - Is the thread to which this annotation belongs currently collapsed?
 * @prop {Object} annotationsService - Injected service
 */

/**
 * A single annotation.
 *
 * @param {AnnotationProps} props
 */
function Annotation({
  annotation,
  hasAppliedFilter,
  isReply,
  onToggleReplies,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
  annotationsService,
}) {
  const store = useStoreProxy();
  const isFocused = store.isAnnotationFocused(annotation.$tag);

  // An annotation will have a draft if it is being edited
  const draft = store.getDraft(annotation);
  const userid = store.profile().userid;
  const isSaving = store.isSavingAnnotation(annotation);

  const isCollapsedReply = isReply && threadIsCollapsed;

  const hasQuote = !!quote(annotation);

  const isEditing = !!draft && !isSaving;

  const showActions = !isSaving && !isEditing;
  const showReplyToggle = !isReply && !hasAppliedFilter && replyCount > 0;

  const onReply = () => annotationsService.reply(annotation, userid);

  return (
    <article
      className={classnames('Annotation', {
        'Annotation--reply': isReply,
        'is-collapsed': threadIsCollapsed,
        'is-focused': isFocused,
      })}
    >
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        replyCount={replyCount}
        showDocumentInfo={showDocumentInfo}
        threadIsCollapsed={threadIsCollapsed}
      />

      {hasQuote && (
        <AnnotationQuote annotation={annotation} isFocused={isFocused} />
      )}

      {!isCollapsedReply && !isEditing && (
        <AnnotationBody annotation={annotation} />
      )}

      {isEditing && <AnnotationEditor annotation={annotation} />}

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
            {isSaving && <div className="Annotation__actions">Saving...</div>}
            {showActions && (
              <div className="Annotation__actions">
                <AnnotationActionBar
                  annotation={annotation}
                  onReply={onReply}
                />
              </div>
            )}
          </div>
        </footer>
      )}
    </article>
  );
}

Annotation.propTypes = {
  annotation: propTypes.object.isRequired,
  hasAppliedFilter: propTypes.bool.isRequired,
  isReply: propTypes.bool,
  onToggleReplies: propTypes.func,
  replyCount: propTypes.number.isRequired,
  showDocumentInfo: propTypes.bool.isRequired,
  threadIsCollapsed: propTypes.bool.isRequired,
  annotationsService: propTypes.object.isRequired,
};

Annotation.injectedProps = ['annotationsService'];

export default withServices(Annotation);
