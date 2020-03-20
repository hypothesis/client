import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import useStore from '../store/use-store';
import * as annotationMetadata from '../util/annotation-metadata';
import { withServices } from '../util/service-context';

/**
 * Banner allows moderators to hide/unhide the flagged
 * annotation from other users.
 */
function ModerationBanner({ annotation, api, toastMessenger }) {
  // actions
  const store = useStore(store => ({
    hide: store.hideAnnotation,
    unhide: store.unhideAnnotation,
  }));

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
        store.hide(annotation.id);
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
        store.unhide(annotation.id);
      })
      .catch(() => {
        toastMessenger.error('Failed to unhide annotation');
      });
  };

  const toggleButtonProps = (() => {
    const props = {};
    if (annotation.hidden) {
      props.onClick = unhideAnnotation;
      props.title = 'Make this annotation visible to everyone';
    } else {
      props.onClick = hideAnnotation;
      props.title = 'Hide this annotation from non-moderators';
    }
    return props;
  })();

  const bannerClasses = classnames('moderation-banner', {
    'is-flagged': flagCount > 0,
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
  /**
   * The annotation object for this banner. This contains
   * state about the flag count or its hidden value.
   */
  annotation: propTypes.object.isRequired,

  // Injected services.
  api: propTypes.object.isRequired,
  toastMessenger: propTypes.object.isRequired,
};

ModerationBanner.injectedProps = ['api', 'toastMessenger'];

export default withServices(ModerationBanner);
