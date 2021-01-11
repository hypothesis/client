import { createElement } from 'preact';

import useRootThread from './hooks/use-root-thread';
import { useStoreProxy } from '../store/use-store';
import { countVisible } from '../util/thread';

import Spinner from './spinner';

/**
 * Render count of annotations (or filtered results) visible in the notebook view
 *
 * There are three possible overall states:
 * - No results (regardless of whether annotations are filtered): "No results"
 * - Annotations are unfiltered: "X threads (Y annotations)"
 *     Thread count does not render until all annotations are loaded
 * - Annotations are filtered: "X results [(and Y more)]"
 */
function NotebookResultCount() {
  const store = useStoreProxy();

  const forcedVisibleCount = store.forcedVisibleAnnotations().length;
  const hasAppliedFilter = store.hasAppliedFilter();
  const resultCount = store.annotationResultCount();
  const isLoading = store.isLoading();

  const rootThread = useRootThread();
  const visibleCount = isLoading ? resultCount : countVisible(rootThread);

  const hasResults = rootThread.children.length > 0;

  const hasForcedVisible = forcedVisibleCount > 0;
  const matchCount = visibleCount - forcedVisibleCount;
  const threadCount = rootThread.children.length;

  return (
    <div className="notebook-result-count u-layout-row">
      {isLoading && <Spinner />}
      {!isLoading && (
        <h2>
          {!hasResults && <span>No results</span>}
          {hasResults && hasAppliedFilter && (
            <span>
              {matchCount} {matchCount === 1 ? 'result' : 'results'}
            </span>
          )}
          {hasResults && !hasAppliedFilter && (
            <span>
              {threadCount} {threadCount === 1 ? 'thread' : 'threads'}
            </span>
          )}
        </h2>
      )}
      {hasForcedVisible && <h3>(and {forcedVisibleCount} more)</h3>}
      {!hasAppliedFilter && hasResults && (
        <h3>
          ({visibleCount} {visibleCount === 1 ? 'annotation' : 'annotations'})
        </h3>
      )}
    </div>
  );
}

NotebookResultCount.propTypes = {};

export default NotebookResultCount;
