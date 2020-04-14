import classnames from 'classnames';
import { createElement } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import debounce from 'lodash.debounce';
import propTypes from 'prop-types';
import useStore from '../store/use-store';
import { withServices } from '../util/service-context';

import Thread from './thread';

/**
 * A "top-level" `Thread`, rendered as a "card" in the sidebar. A `Thread`
 * renders its own child `Thread`s within itself.
 */
function ThreadCard({ frameSync, settings, thread }) {
  const threadTag = useMemo(() => {
    return thread.annotation && thread.annotation.$tag;
  }, [thread]);

  const isFocused = useStore(store => store.isAnnotationFocused(threadTag));

  const focusThreadAnnotation = useCallback(
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

  return (
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      onClick={() => scrollToAnnotation(threadTag)}
      onMouseEnter={() => focusThreadAnnotation(threadTag)}
      onMouseLeave={() => focusThreadAnnotation(null)}
      key={thread.id}
      className={classnames('thread-card', {
        'is-focused': isFocused,
        'thread-card--theme-clean': settings && settings.theme === 'clean',
      })}
    >
      <Thread thread={thread} showDocumentInfo={false} />
    </div>
  );
}

ThreadCard.propTypes = {
  thread: propTypes.object.isRequired,

  /** injected */
  frameSync: propTypes.object.isRequired,
  settings: propTypes.object,
};

ThreadCard.injectedProps = ['frameSync', 'settings'];

export default withServices(ThreadCard);
