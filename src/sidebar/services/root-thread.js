import buildThread from '../build-thread';
import * as metadata from '../util/annotation-metadata';
import memoize from '../util/memoize';
import * as tabs from '../util/tabs';

/**
 * @typedef {import('../build-thread').Thread} Thread
 * @typedef {import('../build-thread').Options} BuildOptions
 */

// Mapping from sort order name to a less-than predicate
// function for comparing annotations to determine their sort order.
const sortFns = {
  Newest: function (a, b) {
    return a.updated > b.updated;
  },
  Oldest: function (a, b) {
    return a.updated < b.updated;
  },
  Location: function (a, b) {
    return metadata.location(a) < metadata.location(b);
  },
};

/**
 * Root conversation thread for the sidebar and stream.
 *
 * This performs two functions:
 *
 * 1. It listens for annotations being loaded, created and unloaded and
 *    dispatches store.{addAnnotations|removeAnnotations} actions.
 * 2. Listens for changes in the UI state and rebuilds the root conversation
 *    thread.
 *
 * The root thread is then displayed by viewer.html
 */
// @ngInject
export default function RootThreadService(store, searchFilter, viewFilter) {
  /**
   * Compose the options needed to build the root thread, including search
   * filters and sort options.
   *
   * @param state - The current UI state (loaded annotations, sort mode,
   *        filter settings etc.). Not used directly within the function
   *        but used to memoize it.
   * @return {Thread}
   */
  /* eslint-disable-next-line no-unused-vars */
  function buildRootThread(state) {
    const shouldFilterThread = !!(
      store.filterQuery() || store.focusModeFocused()
    );

    /** @type {BuildOptions} */
    const options = {
      forceVisible: store.forcedVisibleAnnotations(),
      expanded: store.expandedThreads(),
      highlighted: store.highlightedAnnotations(),
      selected: store.selectedAnnotations(),
      sortCompareFn: sortFns[store.sortKey()],
    };

    if (shouldFilterThread) {
      const filters = searchFilter.generateFacetedFilter(store.filterQuery(), {
        // if a focus mode is applied (focused) and we're focusing on a user
        user: store.focusModeFocused() && store.focusModeUserId(),
      });

      options.filterFn = annot =>
        viewFilter.filter([annot], filters).length > 0;
    }

    // In sidebar mode, filter out threads with missing annotations,
    // or threads that don't belong in the
    // current tab (e.g. only show Page Notes in the Notes tab)
    if (store.route() === 'sidebar' && !shouldFilterThread) {
      options.threadFilterFn = thread => {
        if (!thread.annotation) {
          return false;
        }
        return tabs.shouldShowInTab(thread.annotation, store.selectedTab());
      };
    }

    // Get the currently loaded annotations and the set of inputs which
    // determines what is visible and build the visible thread structure
    return buildThread(store.annotations(), options);
  }

  /**
   * Build the root conversation thread from the given UI state. Memoize it
   * so that it only gets re-computed when store state changes.
   * @return {Thread}
   */
  this.thread = memoize(buildRootThread);
}
