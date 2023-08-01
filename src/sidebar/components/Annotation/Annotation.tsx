import { CardActions, Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo } from 'preact/hooks';

import type { Annotation as IAnnotation } from '../../../types/api';
import {
  annotationRole,
  isOrphan,
  isSaved,
  quote,
} from '../../helpers/annotation-metadata';
import { annotationDisplayName } from '../../helpers/annotation-user';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import { useSidebarStore } from '../../store';
import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';
import AnnotationReplyToggle from './AnnotationReplyToggle';

function SavingMessage() {
  return (
    <div
      className={classnames(
        'flex grow justify-end items-center gap-x-1',
        // Make sure height matches that of action-bar icons so that there
        // isn't a height change when transitioning in and out of saving state
        'h-8 touch:h-touch-minimum',
      )}
      data-testid="saving-message"
    >
      <span
        // Slowly fade in the Spinner such that it only shows up if the saving
        // is slow
        className="text-[16px] animate-fade-in-slow"
      >
        <Spinner size="sm" />
      </span>
      <div className="text-color-text-light font-medium">Saving...</div>
    </div>
  );
}

export type AnnotationProps = {
  annotation: IAnnotation;
  isReply: boolean;
  /** Number of replies to this annotation's thread */
  replyCount: number;
  /** Is the thread to which this annotation belongs currently collapsed? */
  threadIsCollapsed: boolean;
  /**
   * Callback to expand/collapse reply threads. The presence of a function
   * indicates a toggle should be rendered.
   */
  onToggleReplies?: () => void;

  // injected
  annotationsService: AnnotationsService;
};

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
}: AnnotationProps) {
  const store = useSidebarStore();

  const annotationQuote = quote(annotation);
  const draft = store.getDraft(annotation);
  const userid = store.profile().userid;

  const isHovered = store.isAnnotationHovered(annotation.$tag);
  const isSaving = store.isSavingAnnotation(annotation);

  const isEditing = !!draft && !isSaving;
  const isCollapsedReply = isReply && threadIsCollapsed;

  const showActions = !isSaving && !isEditing && isSaved(annotation);

  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');

  const onReply = () => {
    if (isSaved(annotation) && userid) {
      annotationsService.reply(annotation, userid);
    }
  };

  const authorName = useMemo(
    () =>
      annotationDisplayName(annotation, defaultAuthority, displayNamesEnabled),
    [annotation, defaultAuthority, displayNamesEnabled],
  );

  const annotationDescription = isSaved(annotation)
    ? annotationRole(annotation)
    : `New ${annotationRole(annotation).toLowerCase()}`;

  return (
    <article
      className="space-y-4"
      aria-label={`${annotationDescription} by ${authorName}`}
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
          isHovered={isHovered}
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
            <CardActions classes="grow">
              <AnnotationActionBar annotation={annotation} onReply={onReply} />
            </CardActions>
          )}
        </footer>
      )}
    </article>
  );
}

export default withServices(Annotation, ['annotationsService']);
