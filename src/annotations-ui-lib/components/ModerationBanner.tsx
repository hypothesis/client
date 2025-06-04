import { Button, FlagIcon, HideIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { useAnnotationContext } from '../helpers/AnnotationContext';
import * as metadata from '../helpers/annotation-metadata';
import type { Annotation } from '../helpers/types';

export type ModerationBannerProps = {
  annotation: Annotation;
};

/**
 * Banner allows moderators to hide/unhide the flagged annotation from other
 * users.
 */
export default function ModerationBanner({
  annotation,
}: ModerationBannerProps) {
  const { events } = useAnnotationContext();
  const flagCount = metadata.flagCount(annotation);
  const isReply = metadata.isReply(annotation);

  const isHiddenOrFlagged =
    flagCount !== null && (flagCount > 0 || annotation.hidden);

  if (!isHiddenOrFlagged) {
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
          '-mt-3 -ml-3 -mr-3': !isReply,
          // For replies, break out of the right padding only
          '-mr-3': isReply,
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
      <div className="self-center pr-2">
        <Button
          classes={classnames(
            'px-1.5 py-1',
            'bg-slate-1 text-grey-7 bg-grey-2',
            'enabled:hover:text-grey-9 enabled:hover:bg-grey-3 disabled:text-grey-5',
            'aria-pressed:bg-grey-3 aria-expanded:bg-grey-3',
          )}
          onClick={
            annotation.hidden ? events?.onUnhideFlagged : events?.onHideFlagged
          }
          title={
            annotation.hidden
              ? 'Make this annotation visible to everyone'
              : 'Hide this annotation from non-moderators'
          }
          size="custom"
          variant="custom"
        >
          {annotation.hidden ? 'Unhide' : 'Hide'}
        </Button>
      </div>
    </div>
  );
}
