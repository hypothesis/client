import { useEffect, useLayoutEffect, useMemo, useState } from 'preact/hooks';
import classnames from 'classnames';
import debounce from 'lodash.debounce';

import { ListenerCollection } from '../../shared/listener-collection';
import {
  calculateVisibleThreads,
  THREAD_DIMENSION_DEFAULTS,
} from '../helpers/visible-threads';
import { useStoreProxy } from '../store/use-store';
import { getElementHeightWithMargins } from '../util/dom';

import ThreadCard from './ThreadCard';

/** @typedef {import('../helpers/build-thread').Thread} Thread */

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

/** @param {number} pos */
function roundScrollPosition(pos) {
  return Math.max(pos - (pos % SCROLL_PRECISION), 0);
}

/**
 * @typedef ThreadListProps
 * @prop {Thread[]} threads
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
function ThreadList({ threads }) {
  // Client height of the scroll container.
  const [scrollContainerHeight, setScrollContainerHeight] = useState(0);

  // Scroll offset of scroll container, rounded to a multiple of `SCROLL_PRECISION`
  // to avoid excessive re-renderings.
  const [scrollPosition, setScrollPosition] = useState(0);

  // Measure the initial size and offset of the scroll container once rendering
  // is complete and attach listeners to observe future size or scroll offset changes.
  useLayoutEffect(() => {
    const listeners = new ListenerCollection();
    const scrollContainer = getScrollContainer();

    setScrollContainerHeight(scrollContainer.clientHeight);
    setScrollPosition(roundScrollPosition(scrollContainer.scrollTop));

    const updateScrollPosition = debounce(
      () => {
        setScrollContainerHeight(scrollContainer.clientHeight);
        setScrollPosition(roundScrollPosition(scrollContainer.scrollTop));
      },
      10,
      { maxWait: 100 }
    );

    listeners.add(scrollContainer, 'scroll', updateScrollPosition);

    // We currently assume that the scroll container's size only changes with
    // the window as a whole. A more general approach would involve using
    // ResizeObserver via the `observeElementSize` utility.
    listeners.add(window, 'resize', updateScrollPosition);

    return () => {
      listeners.removeAll();
      updateScrollPosition.cancel();
    };
  }, []);

  // Map of thread ID to measured height of thread.
  const [threadHeights, setThreadHeights] = useState(() => new Map());

  // ID of thread to scroll to after the next render. If the thread is not
  // present, the value persists until it can be "consumed".
  const [scrollToId, setScrollToId] = useState(
    /** @type {string|null} */ (null)
  );

  const topLevelThreads = threads;

  const { offscreenLowerHeight, offscreenUpperHeight, visibleThreads } =
    useMemo(
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
    const newAnnotations = store.unsavedAnnotations();
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

    /** @param {Thread} thread */
    const getThreadHeight = thread =>
      threadHeights.get(thread.id) || THREAD_DIMENSION_DEFAULTS.defaultHeight;

    const yOffset = topLevelThreads
      .slice(0, threadIndex)
      .reduce((total, thread) => total + getThreadHeight(thread), 0);

    const scrollContainer = getScrollContainer();
    scrollContainer.scrollTop = yOffset;
  }, [scrollToId, topLevelThreads, threadHeights]);

  // When the set of visible threads changes, recalculate the real rendered
  // heights of thread cards and update `threadHeights` state if there are changes.
  useEffect(() => {
    setThreadHeights(prevHeights => {
      const changedHeights = new Map();
      for (let { id } of visibleThreads) {
        const threadElement = /** @type {HTMLElement} */ (
          document.getElementById(id)
        );

        if (!threadElement) {
          // This could happen if the `ThreadList` DOM is not connected to the document.
          //
          // Errors earlier in the render can also potentially cause this (see
          // https://github.com/hypothesis/client/pull/3665#issuecomment-895857072),
          // although we don't in general try to make all effects robust to that
          // as it is a problem that needs to be handled elsewhere.
          console.warn(
            'ThreadList could not measure thread. Element not found.'
          );
          return prevHeights;
        }

        const height = getElementHeightWithMargins(threadElement);
        if (height !== prevHeights.get(id)) {
          changedHeights.set(id, height);
        }
      }

      // Skip update if no heights changed from previous measured values
      // (or defaults).
      if (changedHeights.size === 0) {
        return prevHeights;
      }

      return new Map([...prevHeights, ...changedHeights]);
    });
  }, [visibleThreads]);

  return (
    <div>
      <div style={{ height: offscreenUpperHeight }} />
      {visibleThreads.map(child => (
        <div
          className={classnames(
            // The goal is to space out each annotation card vertically. Typically
            // this is better handled by applying vertical spacing to the parent
            // element (e.g. `space-y-3`) but in this case, the constraints of
            // sibling divs before and after the list of annotation cards prevents
            // this, so a bottom margin is added to each card's wrapping element.
            'mb-3'
          )}
          data-testid="thread-card-container"
          id={child.id}
          key={child.id}
        >
          <ThreadCard thread={child} />
        </div>
      ))}
      <div style={{ height: offscreenLowerHeight }} />
    </div>
  );
}

export default ThreadList;
