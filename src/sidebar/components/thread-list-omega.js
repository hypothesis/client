import { createElement } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';
import debounce from 'lodash.debounce';

import events from '../events';
import useStore from '../store/use-store';
import { isHighlight, isReply } from '../util/annotation-metadata';
import { getElementHeightWithMargins } from '../util/dom';
import { withServices } from '../util/service-context';

import Thread from './thread';

// When we don't have a real measurement of a thread card's height (yet)
// from the browser, use this as an approximate value, in pixels.
const THREAD_DEFAULT_HEIGHT = 200;

/**
 * Calculate the set of `thread`s that should be rendered by estimating which
 * of the threads are within or near the viewport. Make this calculation based
 * on the scroll position of the `threadEl` and the height information in
 * `threadHeights` (some of those heights may be estimates).
 *
 * Also calculate the total height used by all threads, as well as the height
 * of the spaces above and below the rendered threads (that would be taken
 * up if all threads were rendered).
 */
function calculateVisibleThreads(threads, threadEl, threadHeights) {
  // Space above the viewport in pixels which should be considered 'on-screen'
  // when calculating the set of visible threads
  const MARGIN_ABOVE = 800;
  // Same as MARGIN_ABOVE but for the space below the viewport
  const MARGIN_BELOW = 800;
  // List of annotations which are in or near the viewport and need to
  // actually be rendered.
  const visibleThreads = [];

  const calculatedHeights = {
    offscreenLower: 0,
    offscreenUpper: 0,
    total: 0,
  };

  const threadIsAboveViewport = (threadHeight, heights) =>
    heights.total + threadHeight < threadEl.scrollTop - MARGIN_ABOVE;
  const threadIsVisible = (threadHeight, heights) =>
    heights.total < threadEl.scrollTop + window.innerHeight + MARGIN_BELOW;

  threads.forEach(thread => {
    const threadHeight = threadHeights[thread.id] || THREAD_DEFAULT_HEIGHT;
    if (threadIsAboveViewport(threadHeight, calculatedHeights)) {
      calculatedHeights.offscreenUpper += threadHeight;
    } else if (threadIsVisible(threadHeight, calculatedHeights)) {
      visibleThreads.push(thread);
    } else {
      // thread is below visible viewport
      calculatedHeights.offscreenLower += threadHeight;
    }
    calculatedHeights.total += threadHeight;
  });
  return {
    visibleThreads,
    offscreenUpperHeight: calculatedHeights.offscreenUpper,
    offscreenLowerHeight: calculatedHeights.offscreenLower,
    totalHeight: calculatedHeights.total,
  };
}

/**
 * Render a list of threads, but only render those that are in or near the
 * current browser viewport.
 */
function ThreadListOmega({ thread, $rootScope }) {
  const clearSelection = useStore(store => store.clearSelection);
  const topLevelThreads = thread.children || [];

  // A mapping of thread ID to height (in pixels). A thread's cached height
  // starts out as an estimate. As (visible) threads are rendered, entries are
  // updated with more accurate values.
  const threadHeights = useRef({});

  // Reference to the DOM element that serves as the scrolling container for
  // the list of threads
  const threadEl = useRef(
    document.querySelector('.js-thread-list-scroll-root')
  );

  const {
    visibleThreads,
    offscreenUpperHeight,
    offscreenLowerHeight,
    totalHeight,
  } = calculateVisibleThreads(
    topLevelThreads,
    threadEl.current,
    threadHeights.current
  );

  // If either of these two calculated values changes—the total height taken up
  // by all annotation threads (in pixels) or the array of currently-visible
  // threads—a re-render is needed.
  const [, setTotalThreadHeight] = useState(totalHeight);
  const [, setCurrentVisibleThreads] = useState(
    visibleThreads.map(t => t.id).toString()
  );

  // Recalculate visible threads with latest information and update height
  // and visible-thread state. This will cause a re-render if the total height
  // of threads or the Array of visible thread IDs changes.
  const recalculate = debounce(
    () => {
      const updated = calculateVisibleThreads(
        topLevelThreads,
        threadEl.current,
        threadHeights.current
      );
      // If these values have changed, we need a re-render.
      setTotalThreadHeight(updated.totalHeight);
      setCurrentVisibleThreads(
        updated.visibleThreads.map(t => t.id).toString()
      );
    },
    10,
    {
      maxWait: 100,
    }
  );

  // References for tracking a specific thread (ID) that should be scrolled
  // to the top of the `threadEl` and the estimated y-offest (pixels) that
  // this scrolling requires—getting to the right y-offset might take adjustments
  // across multiple renders.
  const scrolledThreadId = useRef(undefined);
  const scrolledThreadOffset = useRef(-1);

  const setScrolledThread = id => {
    scrolledThreadId.current = id;
    scrolledThreadOffset.current = -1;
  };

  const clearScrolledThread = () => {
    scrolledThreadId.current = undefined;
    scrolledThreadOffset.current = -1;
  };

  // Retrieve an estimate for the y-offset (pixels) of a given thread in
  // the list of all threads by summing the (possibly-estimated) heights
  // of the threads above it.
  const getYOffsetFor = threadId => {
    const threadIds = topLevelThreads.map(t => t.id);
    const threadIndex = threadIds.indexOf(threadId);
    if (threadIndex === -1) {
      return 0;
    }
    return threadIds
      .slice(0, threadIndex)
      .reduce(
        (offset, tid) =>
          offset + (threadHeights.current[tid] || THREAD_DEFAULT_HEIGHT),
        0
      );
  };

  // If we have recently attempted to scroll to the position of a specific
  // thread in the thread list, check to see if we have a different calculated
  // y-offset for that thread than we did at last render: that indicates that
  // the previous scroll position/y-offset wasn't entirely accurate and the
  // scroll position should be adjusted.
  const updateScrollPosition = () => {
    if (scrolledThreadId.current) {
      const updatedEstimate = getYOffsetFor(scrolledThreadId.current);
      if (updatedEstimate !== scrolledThreadOffset.current) {
        threadEl.current.scrollTop = updatedEstimate;
        scrolledThreadOffset.current = updatedEstimate;
      } else {
        clearScrolledThread();
      }
    }
  };

  // Scroll the `threadEl` such that thread with `id` is at the top.
  const scrollToThread = id => {
    setScrolledThread(id);
    updateScrollPosition();
  };

  // Some or all of the cached height values for thread cards may be
  // approximations or the real heights may have changed. Obtain the current
  // rendered heights for the visible threads and update the cache.
  const updateThreadHeights = () => {
    const currentHeights = { ...threadHeights.current };
    visibleThreads.forEach(visibleThread => {
      const calculatedHeight = getElementHeightWithMargins(visibleThread.id);
      if (calculatedHeight) {
        currentHeights[visibleThread.id] = calculatedHeight;
      }
    });
    threadHeights.current = currentHeights;
  };

  // When a new annotation is created in the application, scroll to that
  // annotation's thread (unless it is a highlight or reply)
  $rootScope.$on(events.BEFORE_ANNOTATION_CREATED, (event, annotation) => {
    if (!isHighlight(annotation) && !isReply(annotation)) {
      clearSelection();
      scrollToThread(annotation.$tag);
    }
  });

  useEffect(() => {
    const scrollEl = threadEl.current;
    scrollEl.addEventListener('scroll', recalculate);
    window.addEventListener('resize', recalculate);

    updateThreadHeights();
    updateScrollPosition();
    recalculate();

    return () => {
      scrollEl.removeEventListener('scroll', recalculate);
      window.removeEventListener('resize', recalculate);
      recalculate.cancel();
    };
  });

  return (
    <section>
      <div style={{ height: offscreenUpperHeight }} />
      {visibleThreads.map(child => (
        <div id={child.id} key={child.id} className="thread-list-omega__thread">
          <Thread thread={child} showDocumentInfo={false} />
        </div>
      ))}
      <div style={{ height: offscreenLowerHeight }} />
    </section>
  );
}

ThreadListOmega.propTypes = {
  thread: propTypes.object,
  $rootScope: propTypes.object,
};

ThreadListOmega.injectedProps = ['$rootScope'];

export default withServices(ThreadListOmega);
