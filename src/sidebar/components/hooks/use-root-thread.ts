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
