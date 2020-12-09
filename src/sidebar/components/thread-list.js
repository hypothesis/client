import { createElement } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import propTypes from 'prop-types';
import debounce from 'lodash.debounce';

import { useStoreProxy } from '../store/use-store';
import { isHighlight } from '../util/annotation-metadata';
import { getElementHeightWithMargins } from '../util/dom';
import {
  calculateVisibleThreads,
  THREAD_DIMENSION_DEFAULTS,
} from '../util/visible-threads';

import ThreadCard from './thread-card';

/** @typedef {import('../util/build-thread').Thread} Thread */

// The precision of the `scrollPosition` value in pixels; values will be rounded
// down to the nearest multiple of this scale value
const SCROLL_PRECISION = 50;

function getScrollContainer() {
  const container = document.querySelector('.js-thread-list-scroll-root');
  if (!container) {
    throw new Error('Scroll container is missing');
  }
  return container;
}

/**
 * @typedef ThreadListProps
 * @prop {Thread} thread
 */

/**
 * Render a list of threads.
 *
 * The thread list is "virtualized", meaning that only threads in or near the
 * viewport are rendered. This is critical for performance and memory usage as
 * annotations (and replies) are complex interactive components whose
 * user-defined content may include rich media such as images, audio clips,
 * embedded YouTube videos, rendered math and more.
 *
 * @param {ThreadListProps} props
 */
function ThreadList({ thread }) {
  // Height of the visible area of the scroll container.
  const [scrollContainerHeight, setScrollContainerHeight] = useState(
    getScrollContainer().clientHeight
  );

  // Scroll offset of scroll container. This is updated after the scroll
  // container is scrolled, with debouncing to limit update frequency.
  // These values are in multiples of `SCROLL_PRECISION` to optimize
  // for performance.
  const [scrollPosition, setScrollPosition] = useState(
    getScrollContainer().scrollTop
  );

  // Map of thread ID to measured height of thread.
  const [threadHeights, setThreadHeights] = useState({});

  // ID of thread to scroll to after the next render. If the thread is not
  // present, the value persists until it can be "consumed".
  const [scrollToId, setScrollToId] = useState(
    /** @type {string|null} */ (null)
  );

  const topLevelThreads = thread.children;

  const {
    offscreenLowerHeight,
    offscreenUpperHeight,
    visibleThreads,
  } = useMemo(
    () =>
      calculateVisibleThreads(
        topLevelThreads,
        threadHeights,
        scrollPosition,
        scrollContainerHeight
      ),
    [topLevelThreads, threadHeights, scrollPosition, scrollContainerHeight]
  );

  const store = useStoreProxy();

  // Get the `$tag` of the most recently created unsaved annotation.
  const newAnnotationTag = (() => {
    // If multiple unsaved annotations exist, assume that the last one in the
    // list is the most recently created one.
    const newAnnotations = store
      .unsavedAnnotations()
      .filter(ann => !ann.id && !isHighlight(ann));
    if (!newAnnotations.length) {
      return null;
    }
    return newAnnotations[newAnnotations.length - 1].$tag;
  })();

  // Scroll to newly created annotations and replies.
  //
  // nb. If there are multiple unsaved annotations and the newest one is saved
  // or removed, `newAnnotationTag` will revert to the previous unsaved annotation
  // and the thread list will scroll to that.
  useEffect(() => {
    if (newAnnotationTag) {
      store.setForcedVisible(newAnnotationTag, true);
      setScrollToId(newAnnotationTag);
    }
  }, [store, newAnnotationTag]);

  // Effect to scroll a particular thread into view. This is mainly used to
  // scroll a newly created annotation into view.
  useEffect(() => {
    if (!scrollToId) {
      return;
    }

    const threadIndex = topLevelThreads.findIndex(t => t.id === scrollToId);
    if (threadIndex === -1) {
      // Thread is not currently present. The `scrollToId` will be consumed
      // when this thread appears.
      return;
    }

    // Clear `scrollToId` so we don't scroll again after the next render.
    setScrollToId(null);

    const getThreadHeight = thread =>
      threadHeights[thread.id] || THREAD_DIMENSION_DEFAULTS.defaultHeight;

    const yOffset = topLevelThreads
      .slice(0, threadIndex)
      .reduce((total, thread) => total + getThreadHeight(thread), 0);

    const scrollContainer = getScrollContainer();
    scrollContainer.scrollTop = yOffset;
  }, [scrollToId, topLevelThreads, threadHeights]);

  // Attach listeners such that whenever the scroll container is scrolled or the
  // window resized, a recalculation of visible threads is triggered
  useEffect(() => {
    const scrollContainer = getScrollContainer();

    const updateScrollPosition = debounce(
      () => {
        const exactScrollPosition = scrollContainer.scrollTop;
        // Get scroll position to the nearest `SCROLL_PRECISION` multiple
        const roundedScrollPosition = Math.max(
          exactScrollPosition - (exactScrollPosition % SCROLL_PRECISION),
          0
        );
        setScrollContainerHeight(scrollContainer.clientHeight);
        setScrollPosition(roundedScrollPosition);
      },
      10,
      { maxWait: 100 }
    );

    scrollContainer.addEventListener('scroll', updateScrollPosition);
    window.addEventListener('resize', updateScrollPosition);

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollPosition);
      window.removeEventListener('resize', updateScrollPosition);
      updateScrollPosition.cancel();
    };
  }, []);

  // When the set of visible threads changes, recalculate the real rendered
  // heights of thread cards and update `threadHeights` state if there are changes.
  useEffect(() => {
    setThreadHeights(prevHeights => {
      const changedHeights = {};
      for (let { id } of visibleThreads) {
        const threadElement = /** @type {HTMLElement} */ (document.getElementById(
          id
        ));
        const height = getElementHeightWithMargins(threadElement);
        if (height !== prevHeights[id]) {
          changedHeights[id] = height;
        }
      }

      // Skip update if no heights changed from previous measured values
      // (or defaults).
      if (Object.keys(changedHeights).length === 0) {
        return prevHeights;
      }

      return { ...prevHeights, ...changedHeights };
    });
  }, [visibleThreads]);

  return (
    <div>
      <div style={{ height: offscreenUpperHeight }} />
      {visibleThreads.map(child => (
        <div className="thread-list__card" id={child.id} key={child.id}>
          <ThreadCard thread={child} />
        </div>
      ))}
      <div style={{ height: offscreenLowerHeight }} />
    </div>
  );
}

ThreadList.propTypes = {
  /** Should annotations render extra document metadata? */
  thread: propTypes.object.isRequired,
};

export default ThreadList;
