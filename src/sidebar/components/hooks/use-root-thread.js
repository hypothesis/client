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
  return useStore(store => threadAnnotations(store.threadState()));
}
