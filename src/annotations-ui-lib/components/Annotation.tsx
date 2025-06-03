import { CardActions, Spinner } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { useAnnotationContext } from '../helpers/AnnotationContext';
import {
  annotationRole,
  isSaved,
  quote,
  shape,
} from '../helpers/annotation-metadata';
import { isPrivate } from '../helpers/permissions';
import type { Annotation, Draft } from '../helpers/types';
import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';

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
  annotation: Annotation;
};

function draftFromAnnotation(annotation: Annotation): Draft {
  return {
    annotation,
    text: annotation.text,
    description: annotation.target[0]?.description,
    tags: annotation.tags,
    isPrivate: isPrivate(annotation.permissions),
  };
}

export default function Annotation({ annotation }: AnnotationProps) {
  const { authorName, isHighlighted, isOrphan, isHovered, isSaving, events } =
    useAnnotationContext();
  const [draft, setDraft] = useState<Draft | null>(null);
  const initDraft = useCallback(
    () => setDraft(draftFromAnnotation(annotation)),
    [annotation],
  );

  const isEditing = !!draft && !isSaving && !!events?.onSave;
  const showActions = !isSaving && !isEditing && isSaved(annotation);

  const annotationQuote = quote(annotation);
  const targetShape = useMemo(() => shape(annotation), [annotation]);

  const annotationDescription = isSaved(annotation)
    ? annotationRole(annotation)
    : `New ${annotationRole(annotation).toLowerCase()}`;
  const state = isHighlighted ? ' - Highlighted' : '';

  return (
    <div
      className="flex flex-col gap-y-4"
      aria-label={`${annotationDescription} by ${authorName}${state}`}
    >
      <AnnotationHeader annotation={annotation} />
      {targetShape &&
        // TODO <AnnotationThumbnail />
        null}
      {annotationQuote && (
        <AnnotationQuote
          quote={annotationQuote}
          isOrphan={isOrphan}
          isHovered={isHovered}
        />
      )}

      {!isEditing && <AnnotationBody annotation={annotation} />}

      {isEditing && (
        <AnnotationEditor
          annotation={annotation}
          draft={draft}
          onChangeDraft={setDraft}
        />
      )}

      <footer className="flex items-center">
        {isSaving && <SavingMessage />}
        {showActions && (
          <CardActions classes="grow">
            <AnnotationActionBar
              annotation={annotation}
              onStartEdit={initDraft}
            />
          </CardActions>
        )}
      </footer>
    </div>
  );
}
