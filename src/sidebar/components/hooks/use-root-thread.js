import { useService } from '../../util/service-context';
import useStore from '../../store/use-store';

/**
 * Gather together state relevant to building a root thread of annotations and
 * replies and return an updated root thread when changes occur.
 */
export default function useRootThread() {
  const rootThreadService = useService('rootThread');
  // Use a to-be-written selector to get relevant selection state, e.g.
  // filters and forced-visible annotations, etc.
  // const selectionState = useStore(store => store.getSelectionState());
  // const route = useStore(store => store.routeName());
  // const annotations = useStore(store => store.annotations());
  // return useMemo(() => rootThreadService.buildRootThread(annotations, selectionState, route), [annotations, selectionState, route]);
  return useStore(store => rootThreadService.thread(store.getState()));
}
