import useStore from '../../store/use-store';
import threadAnnotations from '../../util/thread-annotations';

/** @typedef {import('../../util/build-thread').Thread} Thread */

/**
 * Gather together state relevant to building a root thread of annotations and
 * replies and return an updated root thread when changes occur.
 *
 * @return {Thread}
 */
export default function useRootThread() {
  const annotations = useStore(store => store.allAnnotations());
  const query = useStore(store => store.filterQuery());
  const route = useStore(store => store.route());
  const selectionState = useStore(store => store.selectionState());
  const filters = useStore(store => {
    /** @type {Object.<string,string>} */
    const filters = {};
    const userFilter = store.userFilter();
    if (userFilter) {
      filters.user = userFilter;
    }
    return filters;
  });

  return threadAnnotations({
    annotations,
    route,
    selection: { ...selectionState, filterQuery: query, filters },
  });
}
