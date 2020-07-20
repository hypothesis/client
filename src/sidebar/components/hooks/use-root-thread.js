import { useService } from '../../util/service-context';
import useStore from '../../store/use-store';

/**
 * Gather together state relevant to building a root thread of annotations and
 * replies and return an updated root thread when changes occur.
 */
export default function useRootThread() {
  const rootThreadService = useService('rootThread');
  return useStore(store => rootThreadService.thread(store.getState()));
}
