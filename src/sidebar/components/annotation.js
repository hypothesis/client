import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import { isReply, quote } from '../helpers/annotation-metadata';
import { withServices } from '../service-context';

import AnnotationActionBar from './annotation-action-bar';
import AnnotationBody from './annotation-body';
import AnnotationEditor from './annotation-editor';
import AnnotationHeader from './annotation-header';
import AnnotationQuote from './annotation-quote';
import AnnotationReplyToggle from './annotation-reply-toggle';

/**
 * @typedef {import("../../types/api").Annotation} Annotation
 * @typedef {import('../../types/api').Group} Group
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

  const shouldShowActions = !isSaving && !isEditing;
  const threadId = /** @type {string} */ (annotation.id);
  const shouldShowReplyToggle = !isReply(annotation) && threadId;

  const onReply = () => annotationsService.reply(annotation, userid);

  return (
    <article
      className={classnames('annotation', {
        'annotation--reply': isReply(annotation),
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
        <footer className="annotation__footer">
          <div className="annotation__controls u-layout-row">
            {shouldShowReplyToggle && (
              <AnnotationReplyToggle
                threadId={threadId}
                threadIsCollapsed={threadIsCollapsed}
                replyCount={replyCount}
              />
            )}
            {isSaving && <div className="annotation__actions">Saving...</div>}
            {shouldShowActions && (
              <div className="annotation__actions">
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
