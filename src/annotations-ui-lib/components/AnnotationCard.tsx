import { Card, CardContent } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { AnnotationContextType } from '../helpers/AnnotationContext';
import { AnnotationContext } from '../helpers/AnnotationContext';
import type { Annotation as AnnotationType } from '../helpers/types';
import Annotation from './Annotation';
import ModerationBanner from './ModerationBanner';

const isFromButtonOrLink = (target: Element) =>
  !!target.closest('button') || !!target.closest('a');

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
        active={context.isHovered}
        classes={classnames(
          'cursor-pointer focus-visible-ring theme-clean:border-none',
          context.features.groupModeration && {
            'border-red': annotation.moderation_status === 'DENIED',
            'border-yellow': annotation.moderation_status === 'SPAM',
            'border-green': annotation.moderation_status === 'APPROVED',
          },
          {
            'border-brand': context.isHighlighted,
          },
        )}
        onClick={e => {
          // Prevent click events intended for another action from
          // triggering a page scroll.
          if (!isFromButtonOrLink(e.target as Element)) {
            context.events?.onClick?.();
          }
        }}
        onMouseEnter={() => context.events?.onHover?.('in')}
        onMouseLeave={() => context.events?.onHover?.('out')}
      >
        <CardContent>
          <div
            className={classnames(
              // Set a max-width to ensure that annotation content does not exceed
              // the width of the container
              'grow max-w-full min-w-0',
            )}
          >
            <ModerationBanner annotation={annotation} />
            <Annotation annotation={annotation} />
          </div>
        </CardContent>
      </Card>
    </AnnotationContext.Provider>
  );
}
