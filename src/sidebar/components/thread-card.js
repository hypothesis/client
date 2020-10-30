import classnames from 'classnames';
import debounce from 'lodash.debounce';
import { createElement } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import propTypes from 'prop-types';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';

import Thread from './thread';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 */

/**
 * @typedef ThreadCardProps
 * @prop {Thread} thread
 * @prop {Object} frameSync - Injected service
 */

/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 *
 * @param {ThreadCardProps} props
 */
function ThreadCard({ frameSync, thread }) {
  const threadTag = thread.annotation && thread.annotation.$tag;
  const isFocused = useStore(store => store.isAnnotationFocused(threadTag));
  const showDocumentInfo = useStore(store => store.route() !== 'sidebar');
  const focusThreadAnnotation = useMemo(
    () =>
      debounce(tag => {
        const focusTags = tag ? [tag] : [];
        frameSync.focusAnnotations(focusTags);
      }, 10),
    [frameSync]
  );

  const scrollToAnnotation = useCallback(
    tag => {
      frameSync.scrollToAnnotation(tag);
    },
    [frameSync]
  );

  /**
   * Is the target's event an <a> or <button> element, or does it have
   * either as an ancestor?
   *
   * @param {Element} target
   */
  const isFromButtonOrLink = target => {
    return !!target.closest('button') || !!target.closest('a');
  };

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (!isFromButtonOrLink(/** @type {Element} */ (e.target))) {
          scrollToAnnotation(threadTag);
        }
      }}
      onMouseEnter={() => focusThreadAnnotation(threadTag)}
      onMouseLeave={() => focusThreadAnnotation(null)}
      key={thread.id}
      className={classnames('thread-card', {
        'is-focused': isFocused,
      })}
    >
      <Thread thread={thread} showDocumentInfo={showDocumentInfo} />
    </div>
  );
}

ThreadCard.propTypes = {
  thread: propTypes.object.isRequired,
  frameSync: propTypes.object.isRequired,
};

ThreadCard.injectedProps = ['frameSync'];

export default withServices(ThreadCard);
