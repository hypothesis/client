import { createElement } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import propTypes from 'prop-types';
import debounce from 'lodash.debounce';
import shallowEqual from 'shallowequal';

import events from '../events';
import useStore from '../store/use-store';
import { isHighlight, isReply } from '../util/annotation-metadata';
import { getElementHeightWithMargins } from '../util/dom';
import { withServices } from '../util/service-context';
import {
  calculateVisibleThreads,
  THREAD_DIMENSION_DEFAULTS,
} from '../util/visible-threads';

import ThreadCard from './thread-card';

// The precision of the `scrollPosition` value in pixels; values will be rounded
// down to the nearest multiple of this scale value
const SCROLL_PRECISION = 50;

function getScrollContainer() {
  return document.querySelector('.js-thread-list-scroll-root');
}

/**
 * Render a list of threads, but only render those that are in or near the
 * current browser viewport.
 */
function ThreadList({ thread, $rootScope }) {
  const clearSelection = useStore(store => store.clearSelection);
  // Height of the scrollable container. For the moment, this is the same as
  // the window height.
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

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
  const [scrollToId, setScrollToId] = useState(null);

  const topLevelThreads = thread.children;
  const topLevelThreadIds = useMemo(() => topLevelThreads.map(t => t.id), [
    topLevelThreads,
  ]);

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

  // Listen for when a new annotation is created in the application, and trigger
  // a scroll to that annotation's thread card (unless highlight or reply)
  useEffect(() => {
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

  // Effect to scroll a particular thread into view. This is mainly used to
  // scroll a newly created annotation into view (as triggered by the
  // listener for `BEFORE_ANNOTATION_CREATED`)
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
        setWindowHeight(window.innerHeight);
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

  // When the set of top-level threads changes, recalculate the real rendered
  // heights of thread cards and update `threadHeights` state if there are changes.
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

    // Functional update of `threadHeights` state: `heights` is previous state
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

  return (
    <section>
      <div style={{ height: offscreenUpperHeight }} />
      {visibleThreads.map(child => (
        <div className="thread-list__card" id={child.id} key={child.id}>
          <ThreadCard thread={child} />
        </div>
      ))}
      <div style={{ height: offscreenLowerHeight }} />
    </section>
  );
}

ThreadList.propTypes = {
  /** Should annotations render extra document metadata? */
  thread: propTypes.object.isRequired,

  /** injected */
  $rootScope: propTypes.object.isRequired,
};

ThreadList.injectedProps = ['$rootScope'];

export default withServices(ThreadList);
