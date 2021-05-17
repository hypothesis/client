import classnames from 'classnames';

import { useStoreProxy } from '../../store/use-store';
import { quote } from '../../helpers/annotation-metadata';
import { withServices } from '../../service-context';

import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';
import AnnotationReplyToggle from './AnnotationReplyToggle';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import('../../../types/api').Group} Group
 */

/**
 * @typedef AnnotationProps
 * @prop {Annotation} [annotation] - The annotation to render. If undefined,
 *   this Annotation will render as a "missing annotation" and will stand in
 *   as an Annotation for threads that lack an annotation.
 * @prop {boolean} hasAppliedFilter - Is any filter applied currently?
 * @prop {boolean} isReply
 * @prop {VoidFunction} onToggleReplies - Callback to expand/collapse reply threads
 * @prop {number} replyCount - Number of replies to this annotation's thread
 * @prop {boolean} threadIsCollapsed - Is the thread to which this annotation belongs currently collapsed?
 * @prop {'visible'|'hidden'|'header-only'} [visibility] - The portion of the annotation to display
 * @prop {import('../../services/annotations').AnnotationsService} annotationsService
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
  threadIsCollapsed,
  visibility = 'visible',
  annotationsService,
}) {
  const isCollapsedReply = isReply && threadIsCollapsed;

  const store = useStoreProxy();

  const hasQuote = annotation && !!quote(annotation);
  const isFocused = annotation && store.isAnnotationFocused(annotation.$tag);
  const isSaving = annotation && store.isSavingAnnotation(annotation);
  const isEditing = annotation && !!store.getDraft(annotation) && !isSaving;

  const userid = store.profile().userid;
  const showActions = !isSaving && !isEditing;
  const showReplyToggle = !isReply && !hasAppliedFilter && replyCount > 0;

  const onReply = () => annotationsService.reply(annotation, userid);

  if (visibility === 'hidden') {
    return null;
  }

  if (visibility === 'header-only') {
    return annotation ? (
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        replyCount={replyCount}
        threadIsCollapsed={threadIsCollapsed}
      />
    ) : null;
  }

  return (
    <article
      className={classnames('Annotation', {
        'Annotation--missing': !annotation,
        'Annotation--reply': isReply,
        'is-collapsed': threadIsCollapsed,
        'is-focused': isFocused,
      })}
    >
      {annotation && (
        <>
          <AnnotationHeader
            annotation={annotation}
            isEditing={isEditing}
            replyCount={replyCount}
            threadIsCollapsed={threadIsCollapsed}
          />

          {hasQuote && (
            <AnnotationQuote annotation={annotation} isFocused={isFocused} />
          )}

          {!isCollapsedReply && !isEditing && (
            <AnnotationBody annotation={annotation} />
          )}

          {isEditing && <AnnotationEditor annotation={annotation} />}
        </>
      )}

      {!annotation && !isCollapsedReply && (
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
            {isSaving && <div className="Annotation__actions">Saving...</div>}
            {annotation && showActions && (
              <div className="u-layout-row--justify-right u-stretch">
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

export default withServices(Annotation, ['annotationsService']);
