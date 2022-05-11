import { Actions, Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import {
  annotationRole,
  isOrphan,
  isSaved,
  quote,
} from '../../helpers/annotation-metadata';
import { annotationDisplayName } from '../../helpers/annotation-user';
import { withServices } from '../../service-context';

import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';
import AnnotationReplyToggle from './AnnotationReplyToggle';

/**
 * @typedef {import("../../../types/api").Annotation} Annotation
 */

/**
 * @typedef AnnotationProps
 * @prop {Annotation} annotation
 * @prop {boolean} isReply
 * @prop {VoidFunction} [onToggleReplies] - Callback to expand/collapse reply
 *   threads. The presence of a function indicates a toggle should be rendered.
 * @prop {number} replyCount - Number of replies to this annotation's thread
 * @prop {boolean} threadIsCollapsed - Is the thread to which this annotation belongs currently collapsed?
 * @prop {import('../../services/annotations').AnnotationsService} annotationsService
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
 * A single annotation.
 *
 * @param {AnnotationProps} props
 */
function Annotation({
  annotation,
  isReply,
  onToggleReplies,
  replyCount,
  threadIsCollapsed,
  annotationsService,
}) {
  const store = useSidebarStore();

  const annotationQuote = quote(annotation);
  const draft = store.getDraft(annotation);
  const userid = store.profile().userid;

  const isFocused = store.isAnnotationFocused(annotation.$tag);
  const isSaving = store.isSavingAnnotation(annotation);

  const isEditing = !!draft && !isSaving;
  const isCollapsedReply = isReply && threadIsCollapsed;

  const showActions = !isSaving && !isEditing && isSaved(annotation);

  const onReply = () => {
    if (isSaved(annotation) && userid) {
      annotationsService.reply(annotation, userid);
    }
  };

  const authorName = useMemo(
    () => annotationDisplayName(annotation, store),
    [annotation, store]
  );

  return (
    <article
      className="space-y-4"
      aria-label={`${annotationRole(annotation)} by ${authorName}`}
    >
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        replyCount={replyCount}
        threadIsCollapsed={threadIsCollapsed}
      />

      {annotationQuote && (
        <AnnotationQuote
          quote={annotationQuote}
          isFocused={isFocused}
          isOrphan={isOrphan(annotation)}
        />
      )}

      {!isCollapsedReply && !isEditing && (
        <AnnotationBody annotation={annotation} />
      )}

      {isEditing && <AnnotationEditor annotation={annotation} draft={draft} />}

      {!isCollapsedReply && (
        <footer className="flex items-center">
          {onToggleReplies && (
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
