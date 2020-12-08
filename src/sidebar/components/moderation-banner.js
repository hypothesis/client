import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import * as annotationMetadata from '../util/annotation-metadata';
import { withServices } from '../util/service-context';

/**
 * @typedef {import('../../types/api').Annotation} Annotation
 */

/**
 * @typedef ModerationBannerProps
 * @prop {Annotation} annotation -
 *   The annotation object for this banner. This contains state about the flag count
 *   or its hidden value.
 * @prop {Object} api - Injected service
 * @prop {Object} toastMessenger - Injected service
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
    api.annotation
      .hide({ id: annotation.id })
      .then(() => {
        store.hideAnnotation(annotation.id);
      })
      .catch(() => {
        toastMessenger.error('Failed to hide annotation');
      });
  };

  /**
   * Un-hide an annotation from non-moderator users.
   */
  const unhideAnnotation = () => {
    api.annotation
      .unhide({ id: annotation.id })
      .then(() => {
        store.unhideAnnotation(annotation.id);
      })
      .catch(() => {
        toastMessenger.error('Failed to unhide annotation');
      });
  };

  const toggleButtonProps = (() => {
    const buttonProps = {};
    if (annotation.hidden) {
      buttonProps.onClick = unhideAnnotation;
      buttonProps.title = 'Make this annotation visible to everyone';
    } else {
      buttonProps.onClick = hideAnnotation;
      buttonProps.title = 'Hide this annotation from non-moderators';
    }
    buttonProps['aria-label'] = buttonProps.title;
    return buttonProps;
  })();

  const bannerClasses = classnames('moderation-banner', {
    'is-flagged': flagCount !== null && flagCount > 0,
    'is-hidden': annotation.hidden,
    'is-reply': annotationMetadata.isReply(annotation),
  });

  if (!isHiddenOrFlagged) {
    return null;
  }
  return (
    <div className={bannerClasses}>
      {!!flagCount && !annotation.hidden && (
        <span>Flagged for review x{flagCount}</span>
      )}
      {annotation.hidden && (
        <span>Hidden from users. Flagged x{flagCount}</span>
      )}
      <span className="u-stretch" />
      <button {...toggleButtonProps}>
        {annotation.hidden ? 'Unhide' : 'Hide'}
      </button>
    </div>
  );
}

ModerationBanner.propTypes = {
  annotation: propTypes.object.isRequired,
  api: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

ModerationBanner.injectedProps = ['api', 'toastMessenger'];

export default withServices(ModerationBanner);
