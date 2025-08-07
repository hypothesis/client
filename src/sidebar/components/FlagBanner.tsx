import { FlagIcon, HideIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { Annotation } from '../../types/api';
import * as annotationMetadata from '../helpers/annotation-metadata';

export type FlagBannerProps = {
  annotation: Annotation;
};

/**
 * Banner allows moderators to know if an annotation is flagged
 */
export default function FlagBanner({ annotation }: FlagBannerProps) {
  const flagCount = annotationMetadata.flagCount(annotation);
  const isFlagged = !!flagCount;

  if (!isFlagged) {
    return null;
  }

  return (
    <div
      className={classnames(
        'flex gap-x-3 bg-grey-1 text-color-text font-semibold',
        // Match the card's border radius and hide overflow
        'rounded-t-lg overflow-hidden',
        // FIXME: Refactor margins: where possible manage them in a parent
        'mb-2 ',
        {
          // For top-level annotations, use negative margins to "break out" of
          // the parent card's 3-unit padding and have the banner span the
          // full card width with no padding
          '-mt-3 -ml-3 -mr-3': !annotationMetadata.isReply(annotation),
          // For replies, break out of the right padding only
          '-mr-3': annotationMetadata.isReply(annotation),
        },
      )}
    >
      <div
        className={classnames('p-3 text-white', {
          'bg-red-error': !annotation.hidden,
          'bg-grey-6': annotation.hidden,
        })}
      >
        {annotation.hidden ? (
          <HideIcon className="w-em h-em" />
        ) : (
          <FlagIcon className="w-em h-em" />
        )}
      </div>
      <div className="self-center grow">
        {!annotation.hidden && (
          <span>
            Flagged for review by {flagCount}{' '}
            {flagCount === 1 ? 'user' : 'users'}
          </span>
        )}
        {annotation.hidden && <span>Hidden from users</span>}
      </div>
    </div>
  );
}
