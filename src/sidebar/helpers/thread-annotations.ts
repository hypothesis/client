import type { Annotation } from '../../types/api';
import { memoize } from '../util/memoize';
import { isWaitingToAnchor } from './annotation-metadata';
import { buildThread } from './build-thread';
import type { Thread, BuildThreadOptions } from './build-thread';
import { filterAnnotations } from './filter-annotations';
import { parseFilterQuery } from './query-parser';
import type { FilterField } from './query-parser';
import { tabForAnnotation } from './tabs';
import { sorters } from './thread-sorters';

export type ThreadState = {
  annotations: Annotation[];
  showTabs: boolean;
  selection: {
    expanded: Record<string, boolean>;
    filterQuery: string | null;
    filters: Partial<Record<FilterField, string>>;
    forcedVisible: string[];
    selected: string[];
    sortKey: keyof typeof sorters;
    selectedTab: 'annotation' | 'note' | 'orphan';
  };
};

export type ThreadAnnotationsResult = {
  /**
   * Count of annotations for each tab.
   *
   * These are only computed if {@link ThreadState.showTabs} is true.
   */
  tabCounts: {
    annotation: number;
    note: number;
    orphan: number;
  };

  /**
   * Root thread containing all annotation threads that match the current
   * filters and selected tab.
   */
  rootThread: Thread;
};

/**
 * Cobble together the right set of options and filters based on current
 * `threadState` to build the root thread.
 */
function threadAnnotationsImpl(
  threadState: ThreadState,
): ThreadAnnotationsResult {
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
    const filters = parseFilterQuery(
      selection.filterQuery || '',
      selection.filters,
    );
    options.filterFn = ann => filterAnnotations([ann], filters).length > 0;
  }

  const rootThread = buildThread(threadState.annotations, options);

  const tabCounts = {
    annotation: 0,
    note: 0,
    orphan: 0,
  };

  if (threadState.showTabs) {
    rootThread.children = rootThread.children.filter(thread => {
      if (thread.annotation && isWaitingToAnchor(thread.annotation)) {
        // Until this annotation anchors or fails to anchor, we do not know which
        // tab it should be displayed in.
        return false;
      }
      const tab = thread.annotation
        ? tabForAnnotation(thread.annotation)
        : 'annotation';
      tabCounts[tab] += 1;
      return tab === selection.selectedTab;
    });
  }

  return { tabCounts, rootThread };
}

export const threadAnnotations = memoize(threadAnnotationsImpl);
