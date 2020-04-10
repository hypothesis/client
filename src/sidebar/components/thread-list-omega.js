import { createElement } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import propTypes from 'prop-types';
import debounce from 'lodash.debounce';
import shallowEqual from 'shallowequal';

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
 * of the threads are within or near the viewport.
 *
 * @param {Thread[]} threads - List of threads in the order they appear
 * @param {Object} threadHeights - Map of thread ID to measured height
 * @param {number} scrollPos - Vertical scroll offset of scrollable container
 * @param {number} windowHeight -
 *   Height of the visible area of the scrollable container.
 */
function calculateVisibleThreads(
  threads,
  threadHeights,
  scrollPos,
  windowHeight
) {
  // Space above the viewport in pixels which should be considered 'on-screen'
  // when calculating the set of visible threads
  const MARGIN_ABOVE = 800;
  // Same as MARGIN_ABOVE but for the space below the viewport
  const MARGIN_BELOW = 800;
  // List of threads which are in or near the viewport and need to
  // actually be rendered.
  const visibleThreads = [];

  const calculatedHeights = {
    offscreenLower: 0,
    offscreenUpper: 0,
    total: 0,
  };

  const threadIsAboveViewport = (threadHeight, heights) =>
    heights.total + threadHeight < scrollPos - MARGIN_ABOVE;
  const threadIsVisible = (threadHeight, heights) =>
    heights.total < scrollPos + windowHeight + MARGIN_BELOW;

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
  };
}

function getScrollContainer() {
  return document.querySelector('.js-thread-list-scroll-root');
}

/**
 * Render a list of threads, but only render those that are in or near the
 * current browser viewport.
 */
function ThreadListOmega({ thread, $rootScope }) {
  const clearSelection = useStore(store => store.clearSelection);

  // Height of the scrollable container. For the moment, this is the same as
  // the window height.
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  // Scroll offset of scroll container. This is updated after the scroll
  // container is scrolled, with debouncing to limit update frequency.
  const [scrollPosition, setScrollPosition] = useState(
    getScrollContainer().scrollTop
  );

  // Map of thread ID to measured height of thread.
  const [threadHeights, setThreadHeights] = useState({});

  // ID of thread to scroll to after the next render. If the thread is not
  // present, the value persists until it can be "consumed".
  const [scrollToId, setScrollToId] = useState(null);

  // Effect to scroll to a new annotation when it is created.
  useEffect(() => {
    // When a new annotation is created in the application, scroll to that
    // annotation's thread (unless it is a highlight or reply)
    const removeListener = $rootScope.$on(
      events.BEFORE_ANNOTATION_CREATED,
      (event, annotation) => {
        if (!isHighlight(annotation) && !isReply(annotation)) {
          clearSelection();
          setScrollToId(annotation.$tag);
        }
      }
    );

    return removeListener;
  }, [$rootScope, clearSelection]);

  // Effect to trigger recalculation of visible threads when scroll
  // container is scrolled or window is resized.
  useEffect(() => {
    const scrollContainer = getScrollContainer();

    const updateScrollPosition = debounce(
      () => {
        setWindowHeight(window.innerHeight);
        setScrollPosition(scrollContainer.scrollTop);
      },
      10,
      { maxWait: 100 }
    );

    scrollContainer.addEventListener('scroll', updateScrollPosition);
    window.addEventListener('resize', updateScrollPosition);

    return () => {
      scrollContainer.removeEventListener('scroll', updateScrollPosition);
      window.removeEventListener('resize', updateScrollPosition);
    };
  }, []);

  const topLevelThreads = thread.children;

  // TODO - We could optimize here by memo-ing such that `topLevelThreadIds`
  // only updates if the IDs did change.
  const topLevelThreadIds = topLevelThreads.map(t => t.id);

  // Effect to update measured thread heights when the set of threads
  // changes.
  useEffect(() => {
    let newHeights = {};

    for (let id of topLevelThreadIds) {
      const threadElement = document.getElementById(id);
      if (!threadElement) {
        // Thread is currently off screen.
        continue;
      }
      const height = getElementHeightWithMargins(threadElement);
      if (height !== null) {
        newHeights[id] = height;
      }
    }

    setThreadHeights(heights => {
      // Merge existing and new heights.
      newHeights = Object.assign({}, heights, newHeights);

      // Skip update if no heights actually changed.
      if (shallowEqual(heights, newHeights)) {
        return heights;
      }
      return newHeights;
    });
  }, [topLevelThreadIds]);

  // TODO - We could optimize `calculateVisibleThreads` as follows:
  //
  // - Pass in thread IDs rather than threads (as result does not depend on
  //   other properties of threads)
  // - Memoize based on inputs (thread IDs, last-measured thread heights,
  //   scroll position, window height)
  const {
    offscreenLowerHeight,
    offscreenUpperHeight,
    visibleThreads,
  } = calculateVisibleThreads(
    topLevelThreads,
    threadHeights,
    scrollPosition,
    windowHeight
  );

  // Effect to scroll a particular thread into view. This is mainly used to
  // scroll a newly created annotation into view.
  useEffect(() => {
    if (!scrollToId) {
      return;
    }

    const threadIndex = topLevelThreads.findIndex(t => t.id === scrollToId);
    if (threadIndex === -1) {
      // Thread is not currently present.
      //
      // When `scrollToId` is set as a result of a `BEFORE_ANNOTATION_CREATED`
      // event, the annotation is not always present in the _next_ render after
      // that event is received, but in another render after that. Therefore
      // we wait until the annotation appears before "consuming" the scroll-to-id.
      return;
    }

    // Clear `scrollToId` so we don't scroll again after the next render.
    setScrollToId(null);

    const getThreadHeight = thread =>
      threadHeights[thread.id] || THREAD_DEFAULT_HEIGHT;

    const yOffset = topLevelThreads
      .slice(0, threadIndex)
      .reduce((total, thread) => total + getThreadHeight(thread), 0);

    const scrollContainer = getScrollContainer();
    scrollContainer.scrollTop = yOffset;
  }, [scrollToId, topLevelThreads, threadHeights]);

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
