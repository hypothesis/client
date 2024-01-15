import { useMemo } from 'preact/hooks';

import { threadAnnotations } from '../../helpers/thread-annotations';
import type {
  ThreadAnnotationsResult,
  ThreadState,
} from '../../helpers/thread-annotations';
import { useSidebarStore } from '../../store';

/**
 * Gather together state relevant to building a root thread of annotations and
 * replies and return an updated root thread when changes occur.
 */
export function useRootThread(): ThreadAnnotationsResult {
  const store = useSidebarStore();
  const annotations = store.allAnnotations();
  const query = store.filterQuery();
  const route = store.route();
  const selectionState = store.selectionState();
  const filters = store.getFilterValues();

  // This logic mirrors code in `SidebarView`. It can be simplified once
  // the "search_panel" feature is turned on everywhere.
  const searchPanelEnabled = store.isFeatureEnabled('search_panel');
  const hasAppliedFilter =
    store.hasAppliedFilter() || store.hasSelectedAnnotations();
  const showTabs =
    route === 'sidebar' && (searchPanelEnabled || !hasAppliedFilter);

  const threadState = useMemo((): ThreadState => {
    const selection = { ...selectionState, filterQuery: query, filters };
    return {
      annotations,
      selection,
      showTabs,
    };
  }, [annotations, query, selectionState, filters, showTabs]);

  return threadAnnotations(threadState);
}
