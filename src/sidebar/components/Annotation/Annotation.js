import { Actions, Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { useStoreProxy } from '../../store/use-store';
import { isOrphan, isSaved, quote } from '../../helpers/annotation-metadata';
import { withServices } from '../../service-context';

import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';
import AnnotationReplyToggle from './AnnotationReplyToggle';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 * @typedef {import("../../../types/api").SavedAnnotation} SavedAnnotation
 * @typedef {import('../../../types/api').Group} Group
 */

function SavingMessage() {
  return (
    <div
      className={classnames(
        'flex grow justify-end items-center gap-x-1',
        // Make sure height matches that of action-bar icons so that there
        // isn't a height change when transitioning in and out of saving state
        'h-8 touch:h-touch-minimum'
      )}
      data-testid="saving-message"
    >
      <Spinner
        classes={classnames(
          'text-xl',
          // Slowly fade in the Spinner such that it only shows up if
          // the saving is slow
          'animate-fade-in-slow'
        )}
        size="small"
      />
      <div className="text-color-text-light font-medium">Saving...</div>
    </div>
  );
}

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
  annotationsService,
}) {
  const isCollapsedReply = isReply && threadIsCollapsed;

  const store = useStoreProxy();

  const draft = annotation && store.getDraft(annotation);

  const hasQuote = annotation && !!quote(annotation);
  const isFocused = annotation && store.isAnnotationFocused(annotation.$tag);
  const isSaving = annotation && store.isSavingAnnotation(annotation);
  const isEditing = annotation && !!draft && !isSaving;

  const userid = store.profile().userid;
  const showActions =
    annotation && !isSaving && !isEditing && isSaved(annotation);
  const showReplyToggle =
    !isReply && !isEditing && !hasAppliedFilter && replyCount > 0;

  const onReply = () => {
    if (annotation && isSaved(annotation)) {
      annotationsService.reply(annotation, userid);
    }
  };

  return (
    <article className="space-y-4">
      {annotation && (
        <>
          <AnnotationHeader
            annotation={annotation}
            isEditing={isEditing}
            replyCount={replyCount}
            threadIsCollapsed={threadIsCollapsed}
          />

          {hasQuote && (
            <AnnotationQuote
              quote={quote(annotation)}
              isFocused={isFocused}
              isOrphan={isOrphan(annotation)}
            />
          )}

          {!isCollapsedReply && !isEditing && (
            <AnnotationBody annotation={annotation} />
          )}

          {isEditing && (
            <AnnotationEditor annotation={annotation} draft={draft} />
          )}
        </>
      )}

      {!annotation && !isCollapsedReply && (
        <div>
          <em>Message not available.</em>
        </div>
      )}

      {!isCollapsedReply && (
        <footer className="flex items-center">
          {showReplyToggle && (
            <AnnotationReplyToggle
              onToggleReplies={onToggleReplies}
              replyCount={replyCount}
              threadIsCollapsed={threadIsCollapsed}
            />
          )}
          {isSaving && <SavingMessage />}
          {showActions && (
            <Actions classes="grow">
              <AnnotationActionBar annotation={annotation} onReply={onReply} />
            </Actions>
          )}
        </footer>
      )}
    </article>
  );
}

export default withServices(Annotation, ['annotationsService']);
