import type { Thread } from './build-thread';

export const THREAD_DIMENSION_DEFAULTS = {
  // When we don't have a real measurement of a thread card's height (yet)
  // from the browser, use this as an approximate value, in pixels.
  defaultHeight: 200,
  // Space above the viewport in pixels which should be considered 'on-screen'
  // when calculating the set of visible threads
  marginAbove: 800,
  // Same as MARGIN_ABOVE but for the space below the viewport
  marginBelow: 800,
};

type VisibleThreads = {
  visibleThreads: Thread[];
  offscreenUpperHeight: number;
  offscreenLowerHeight: number;
};

/**
 * Calculate the set of `ThreadCard`s that should be rendered by
 * estimating which of the threads are within or near the viewport.
 *
 * @param threads - List of threads in the order they appear
 * @param threadHeights - Map of thread ID to measured height
 * @param scrollPos - Vertical scroll offset of scrollable container
 * @param windowHeight - Height of the visible area of the scrollable container.
 * @param options - Dimensional overrides (in px) for defaults
 */
export function calculateVisibleThreads(
  threads: Thread[],
  threadHeights: Map<string, number>,
  scrollPos: number,
  windowHeight: number,
  options: typeof THREAD_DIMENSION_DEFAULTS = THREAD_DIMENSION_DEFAULTS
): VisibleThreads {
  const { defaultHeight, marginAbove, marginBelow } = options;
  const visibleThreads: Thread[] = [];

  // Total height used up by the top-level thread cards
  let totalHeight = 0;
  // Estimated height, in px, of the thread cards above and below the viewport
  let offscreenUpperHeight = 0;
  let offscreenLowerHeight = 0;

  threads.forEach(thread => {
    const threadHeight = threadHeights.get(thread.id) || defaultHeight;

    const threadIsAboveViewport =
      totalHeight + threadHeight < scrollPos - marginAbove;
    const threadIsVisible =
      totalHeight < scrollPos + windowHeight + marginBelow;

    if (threadIsAboveViewport) {
      offscreenUpperHeight += threadHeight;
    } else if (threadIsVisible) {
      visibleThreads.push(thread);
    } else {
      // thread is below visible viewport
      offscreenLowerHeight += threadHeight;
    }
    totalHeight += threadHeight;
  });

  return {
    visibleThreads,
    offscreenUpperHeight,
    offscreenLowerHeight,
  };
}
