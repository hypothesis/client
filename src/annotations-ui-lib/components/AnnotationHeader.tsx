import { HighlightIcon } from '@hypothesis/frontend-shared';
import { useMemo } from 'preact/hooks';

import { useAnnotationContext } from '../helpers/AnnotationContext';
import { hasBeenEdited, isHighlight } from '../helpers/annotation-metadata';
import type { Annotation } from '../helpers/types';
import AnnotationGroupInfo from './AnnotationGroupInfo';
import AnnotationTimestamps from './AnnotationTimestamps';
import AnnotationUser from './AnnotationUser';

export type AnnotationHeaderProps = {
  annotation: Annotation;
};

export default function AnnotationHeader({
  annotation,
}: AnnotationHeaderProps) {
  const { group, authorName } = useAnnotationContext();
  const annotationURL = annotation.links?.html || '';

  const showEditedTimestamp = useMemo(
    () => hasBeenEdited(annotation),
    [annotation],
  );

  return (
    <header>
      <div className="flex gap-x-1 items-center flex-wrap-reverse">
        <AnnotationUser displayName={authorName} />

        <div className="flex justify-end grow">
          <AnnotationTimestamps
            annotationCreated={annotation.created}
            annotationUpdated={annotation.updated}
            annotationURL={annotationURL}
            withEditedTimestamp={showEditedTimestamp}
          />
        </div>
      </div>

      <div
        className="flex gap-x-1 items-baseline flex-wrap-reverse"
        data-testid="extended-header-info"
      >
        {group && <AnnotationGroupInfo group={group} />}
        {isHighlight(annotation) && (
          <HighlightIcon
            title="This is a highlight."
            className="w-[10px] h-[10px] text-color-text-light"
          />
        )}
      </div>
    </header>
  );
}
