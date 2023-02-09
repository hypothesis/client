import {
  ButtonBase,
  FlagIcon,
  HideIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

import type { Annotation } from '../../types/api';
import * as annotationMetadata from '../helpers/annotation-metadata';
import { withServices } from '../service-context';
import type { APIService } from '../services/api';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';

export type ModerationBannerProps = {
  annotation: Annotation;

  // injected
  api: APIService;
  toastMessenger: ToastMessengerService;
};

/**
 * Banner allows moderators to hide/unhide the flagged annotation from other
 * users.
 */
function ModerationBanner({
  annotation,
  api,
  toastMessenger,
}: ModerationBannerProps) {
  const store = useSidebarStore();
  const flagCount = annotationMetadata.flagCount(annotation);

  const isHiddenOrFlagged =
    flagCount !== null && (flagCount > 0 || annotation.hidden);

  /**
   * Hide an annotation from non-moderator users.
   */
  const hideAnnotation = () => {
    const id = annotation.id!;
    api.annotation
      .hide({ id })
      .then(() => {
        store.hideAnnotation(id);
      })
      .catch(() => {
        toastMessenger.error('Failed to hide annotation');
      });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  const unhideAnnotation = () => {
    const id = annotation.id!;
    api.annotation
      .unhide({ id })
      .then(() => {
        store.unhideAnnotation(id);
      })
      .catch(() => {
        toastMessenger.error('Failed to unhide annotation');
      });
  };

  if (!isHiddenOrFlagged) {
    return null;
  }
  return (
    <div
      className={classnames(
        'flex gap-x-3 bg-grey-1 text-color-text font-semibold',
        // FIXME: Refactor margins: where possible manage them in a parent
        'mb-2 ',
        {
          // For top-level annotations, use negative margins to "break out" of
          // the parent card's 3-unit padding and have the banner span the
          // full card width with no padding
          '-mt-3 -ml-3 -mr-3': !annotationMetadata.isReply(annotation),
          // For replies, break out of the right padding only
          '-mr-3': annotationMetadata.isReply(annotation),
        }
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
        <ButtonBase
          classes={classnames(
            'px-1.5 py-1 bg-slate-1 text-grey-7 bg-grey-2',
            'enabled:hover:text-grey-9 enabled:hover:bg-grey-3 disabled:text-grey-5',
            'aria-pressed:bg-grey-3 aria-expanded:bg-grey-3'
          )}
          onClick={annotation.hidden ? unhideAnnotation : hideAnnotation}
          title={
            annotation.hidden
              ? 'Make this annotation visible to everyone'
              : 'Hide this annotationn from non-moderators'
          }
        >
          {annotation.hidden ? 'Unhide' : 'Hide'}
        </ButtonBase>
      </div>
    </div>
  );
}

export default withServices(ModerationBanner, ['api', 'toastMessenger']);
