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
  const showTabs = route === 'sidebar';
  const topAnnotationsPlaceholder = store.isFeatureEnabled(
    'top_annos_placeholder',
  );

  const threadState = useMemo((): ThreadState => {
    const selection = { ...selectionState, filterQuery: query, filters };
    return {
      annotations,
      selection,
      showTabs,
      topAnnotationsPlaceholder,
    };
  }, [
    selectionState,
    query,
    filters,
    annotations,
    showTabs,
    topAnnotationsPlaceholder,
  ]);

  return threadAnnotations(threadState);
}
