import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../../store/use-store';
import { isReply, quote } from '../../helpers/annotation-metadata';
import { withServices } from '../../service-context';

import Button from '../Button';

import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import('../../../types/api').Group} Group
 */

/**
 * @typedef AnnotationProps
 * @prop {Annotation} annotation
 * @prop {number} replyCount - Number of replies to this annotation (thread)
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
  annotationsService,
  replyCount,
  showDocumentInfo,
  threadIsCollapsed,
}) {
  const store = useStoreProxy();
  const isFocused = store.isAnnotationFocused(annotation.$tag);

  // An annotation will have a draft if it is being edited
  const draft = store.getDraft(annotation);
  const userid = store.profile().userid;
  const isSaving = store.isSavingAnnotation(annotation);

  const isCollapsedReply = isReply(annotation) && threadIsCollapsed;

  const hasQuote = !!quote(annotation);

  const isEditing = !!draft && !isSaving;

  const toggleAction = threadIsCollapsed ? 'Show replies' : 'Hide replies';
  const toggleText = `${toggleAction} (${replyCount})`;

  const shouldShowActions = !isSaving && !isEditing;
  const shouldShowReplyToggle = replyCount > 0 && !isReply(annotation);

  const onReply = () => annotationsService.reply(annotation, userid);

  const onToggleReplies = () =>
    // nb. We assume the annotation has an ID here because it is not possible
    // to create replies until the annotation has been saved.
    store.setExpanded(
      /** @type {string} */ (annotation.id),
      !!threadIsCollapsed
    );

  return (
    <article
      className={classnames('Annotation', {
        'Annotation--reply': isReply(annotation),
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
            {shouldShowReplyToggle && (
              <Button
                className="Annotation__reply-toggle"
                onClick={onToggleReplies}
                buttonText={toggleText}
              />
            )}
            {isSaving && <div className="Annotation__actions">Saving...</div>}
            {shouldShowActions && (
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
  replyCount: propTypes.number.isRequired,
  showDocumentInfo: propTypes.bool.isRequired,
  threadIsCollapsed: propTypes.bool.isRequired,
  annotationsService: propTypes.object.isRequired,
};

Annotation.injectedProps = ['annotationsService'];

export default withServices(Annotation);
