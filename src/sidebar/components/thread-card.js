import classnames from 'classnames';
import debounce from 'lodash.debounce';
import { createElement } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import propTypes from 'prop-types';
import { closest } from '../../shared/dom-element';
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
 * @prop {MergedConfig} [settings] - Injected service
 */

/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 *
 * @param {ThreadCardProps} props
 */
function ThreadCard({ frameSync, settings, thread }) {
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
   */
  const isFromButtonOrLink = target => {
    return !!closest(target, 'button') || !!closest(target, 'a');
  };

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      onClick={e => {
        // Prevent click events intended for another action from
        // triggering a page scroll.
        if (!isFromButtonOrLink(e.target)) {
          scrollToAnnotation(threadTag);
        }
      }}
      onMouseEnter={() => focusThreadAnnotation(threadTag)}
      onMouseLeave={() => focusThreadAnnotation(null)}
      key={thread.id}
      className={classnames('thread-card', {
        'is-focused': isFocused,
        'thread-card--theme-clean': settings.theme === 'clean',
      })}
    >
      <Thread thread={thread} showDocumentInfo={showDocumentInfo} />
    </div>
  );
}

ThreadCard.propTypes = {
  thread: propTypes.object.isRequired,
  frameSync: propTypes.object.isRequired,
  settings: propTypes.object,
};

ThreadCard.injectedProps = ['frameSync', 'settings'];

export default withServices(ThreadCard);
