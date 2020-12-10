import buildThread from './build-thread';
import memoize from './memoize';
import * as metadata from './annotation-metadata';
import { generateFacetedFilter } from './search-filter';
import filterAnnotations from './view-filter';
import { shouldShowInTab } from './tabs';

/** @typedef {import('../../types/api').Annotation} Annotation */
/** @typedef {import('./build-thread').Thread} Thread */
/** @typedef {import('./build-thread').Options} BuildThreadOptions */

/**
 * @typedef ThreadState
 * @prop {Annotation[]} annotations
 * @prop {Object} selection
 *   @prop {Object<string,boolean>} selection.expanded
 *   @prop {string|null} selection.filterQuery
 *   @prop {Object<string,string>} selection.filters
 *   @prop {string[]} selection.forcedVisible
 *   @prop {string[]} selection.selected
 *   @prop {string} selection.sortKey
 *   @prop {'annotation'|'note'|'orphan'} selection.selectedTab
 * @prop {string|null} route
 */

// Sort functions keyed on sort option
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
 * Cobble together the right set of options and filters based on current
 * `threadState` to build the root thread.
 *
 * @param {ThreadState} threadState
 * @return {Thread}
 */
function buildRootThread(threadState) {
  const selection = threadState.selection;

  /** @type {Partial<BuildThreadOptions>} */
  const options = {
    expanded: selection.expanded,
    forcedVisible: selection.forcedVisible,
    selected: selection.selected,
    sortCompareFn: sortFns[selection.sortKey],
  };

  // Is there a filter query present, or an applied user (focus) filter?
  // If so, we'll need to filter the annotations
  const annotationsFiltered =
    !!selection.filterQuery || Object.keys(selection.filters).length > 0;

  if (annotationsFiltered) {
    const filters = generateFacetedFilter(
      selection.filterQuery || '',
      selection.filters
    );
    options.filterFn = ann => filterAnnotations([ann], filters).length > 0;
  }

  // If annotations aren't filtered, should we filter out tab-irrelevant
  // annotations (e.g. we should only show notes in the `Notes` tab)
  // in the sidebar?
  const threadFiltered =
    !annotationsFiltered && threadState.route === 'sidebar';

  if (threadFiltered) {
    options.threadFilterFn = thread => {
      if (!thread.annotation) {
        return false;
      }
      return shouldShowInTab(thread.annotation, selection.selectedTab);
    };
  }
  return buildThread(threadState.annotations, options);
}

const threadAnnotations = memoize(buildRootThread);

export default threadAnnotations;
