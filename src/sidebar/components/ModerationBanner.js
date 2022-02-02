import { Icon, LabeledButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { useStoreProxy } from '../store/use-store';
import * as annotationMetadata from '../helpers/annotation-metadata';
import { withServices } from '../service-context';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 */

/**
 * @typedef ModerationBannerProps
 * @prop {Annotation} annotation -
 *   The annotation object for this banner. This contains state about the flag count
 *   or its hidden value.
 * @prop {import('../services/api').APIService} api
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * Banner allows moderators to hide/unhide the flagged
 * annotation from other users.
 *
 * @param {ModerationBannerProps} props
 */
function ModerationBanner({ annotation, api, toastMessenger }) {
  const store = useStoreProxy();
  const flagCount = annotationMetadata.flagCount(annotation);

  const isHiddenOrFlagged =
    flagCount !== null && (flagCount > 0 || annotation.hidden);

  /**
   * Hide an annotation from non-moderator users.
   */
  const hideAnnotation = () => {
    const id = /** @type {string} */ (annotation.id);
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
    const id = /** @type {string} */ (annotation.id);
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
        // Vertical margins should ultimately be handled by the parent, but
        // until we can refactor outer components (e.g. `ThreadCard`), this
        // component manages its own bottom margin
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
        <Icon name={annotation.hidden ? 'hide' : 'flag'} />
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
        <LabeledButton
          classes="py-1 bg-slate-1"
          onClick={annotation.hidden ? unhideAnnotation : hideAnnotation}
          title={
            annotation.hidden
              ? 'Make this annotation visible to everyone'
              : 'Hide this annotationn from non-moderators'
          }
          variant="dark"
        >
          {annotation.hidden ? 'Unhide' : 'Hide'}
        </LabeledButton>
      </div>
    </div>
  );
}

export default withServices(ModerationBanner, ['api', 'toastMessenger']);
