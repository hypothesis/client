import type { Annotation } from '../../types/api';
import { memoize } from '../util/memoize';
import { generateFacetedFilter } from '../util/search-filter';
import { buildThread } from './build-thread';
import type { Thread, BuildThreadOptions } from './build-thread';
import { shouldShowInTab } from './tabs';
import { sorters } from './thread-sorters';
import { filterAnnotations } from './view-filter';

export type ThreadState = {
  annotations: Annotation[];
  route: string | null;
  selection: {
    expanded: Record<string, boolean>;
    filterQuery: string | null;
    filters: Record<string, string>;
    forcedVisible: string[];
    selected: string[];
    sortKey: keyof typeof sorters;
    selectedTab: 'annotation' | 'note' | 'orphan';
  };
};

/**
 * Cobble together the right set of options and filters based on current
 * `threadState` to build the root thread.
 */
function buildRootThread(threadState: ThreadState): Thread {
  const selection = threadState.selection;
  const options: BuildThreadOptions = {
    expanded: selection.expanded,
    forcedVisible: selection.forcedVisible,
    selected: selection.selected,
    sortCompareFn: sorters[selection.sortKey],
  };

  // Is there a filter query present, or an applied user (focus) filter?
  // If so, we'll need to filter the annotations
  const annotationsFiltered =
    !!selection.filterQuery || Object.keys(selection.filters).length > 0;

  if (annotationsFiltered) {
    const filters = generateFacetedFilter(
      selection.filterQuery || '',
      selection.filters,
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

export const threadAnnotations = memoize(buildRootThread);
