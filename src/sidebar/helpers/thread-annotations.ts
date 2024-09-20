import type { Annotation } from '../../types/api';
import { memoize } from '../util/memoize';
import { isWaitingToAnchor } from './annotation-metadata';
import { buildThread } from './build-thread';
import type { Thread, BuildThreadOptions } from './build-thread';
import { filterAnnotations } from './filter-annotations';
import { parseFilterQuery } from './query-parser';
import type { FilterField, ParsedQuery } from './query-parser';
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

    // Split filters into those which apply to both annotations and replies,
    // and those which should only be applied to threads.
    const annotationFilters: Partial<ParsedQuery> = {};
    const threadFilters: Partial<ParsedQuery> = {};
    for (const [field, facet] of Object.entries(filters)) {
      if (facet.filterReplies) {
        annotationFilters[field as FilterField] = facet;
      } else {
        threadFilters[field as FilterField] = facet;
      }
    }

    options.filterFn = ann =>
      filterAnnotations([ann], annotationFilters).length > 0;

    if (Object.values(threadFilters).some(facet => facet.terms.length > 0)) {
      options.threadFilterFn = thread =>
        !!thread.annotation &&
        filterAnnotations([thread.annotation], threadFilters).length > 0;
    }
  }

  const rootThread = buildThread(threadState.annotations, options);

  const tabCounts = {
    annotation: 0,
    note: 0,
    orphan: 0,
  };

  if (threadState.showTabs) {
    rootThread.children = rootThread.children.filter(thread => {
      // If the root annotation in this thread has been deleted, we don't know
      // which tab it used to be in.
      if (!thread.annotation) {
        return false;
      }

      // If this annotation is still anchoring, we do not know whether it should
      // appear in the "Annotations" or "Orphans" tab.
      if (isWaitingToAnchor(thread.annotation)) {
        return false;
      }

      const tab = tabForAnnotation(thread.annotation);
      tabCounts[tab] += 1;
      return tab === selection.selectedTab;
    });
  }

  return { tabCounts, rootThread };
}

export const threadAnnotations = memoize(threadAnnotationsImpl);
