import { Card, CardContent } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type {
  AnnotationContextType} from '../helpers/AnnotationContext';
import {
  AnnotationContext
} from '../helpers/AnnotationContext';
import type { Annotation as AnnotationType } from '../helpers/types';
import Annotation from './Annotation';

export type AnnotationCardProps = {
  annotation: AnnotationType;
  context: AnnotationContextType;
};

/**
 * A combination of the ThreadCard and Thread components from the client repository
 */
export default function AnnotationCard({
  annotation,
  context,
}: AnnotationCardProps) {
  return (
    <AnnotationContext.Provider value={context}>
      <Card
        classes={classnames(
          context.features.groupModeration && {
            'border-red': annotation.moderation_status === 'DENIED',
            'border-yellow': annotation.moderation_status === 'SPAM',
            'border-green': annotation.moderation_status === 'APPROVED',
          },
        )}
      >
        <CardContent>
          <div
            className={classnames(
              // Set a max-width to ensure that annotation content does not exceed
              // the width of the container
              'grow max-w-full min-w-0',
            )}
          >
            <Annotation annotation={annotation} />
          </div>
        </CardContent>
      </Card>
    </AnnotationContext.Provider>
  );
}
