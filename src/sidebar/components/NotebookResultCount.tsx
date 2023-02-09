import { Spinner } from '@hypothesis/frontend-shared/lib/next';

import { countVisible } from '../helpers/thread';
import { useRootThread } from './hooks/use-root-thread';

export type NotebookResultCountProps = {
  /**
   * Number of items that don't match applied filters but have been
   * "forced visible" (expanded) by user interaction. These are described as
   * "and <forcedVisibleCount> more" in filter descriptions
   */
  forcedVisibleCount: number;

  isFiltered: boolean;
  isLoading: boolean;
  resultCount: number;
};
/**
 * Render count of annotations (or filtered results) visible in the notebook view
 *
 * There are three possible overall states:
 * - No results (regardless of whether annotations are filtered): "No results"
 * - Annotations are unfiltered: "X threads (Y annotations)"
 *     Thread count does not render until all annotations are loaded
 * - Annotations are filtered: "X results [(and Y more)]"
 *
 * @param {NotebookResultCountProps} props
 */
function NotebookResultCount({
  forcedVisibleCount,
  isFiltered,
  isLoading,
  resultCount,
}: NotebookResultCountProps) {
  const rootThread = useRootThread();
  const visibleCount = isLoading ? resultCount : countVisible(rootThread);

  const hasResults = rootThread.children.length > 0;

  const hasForcedVisible = isFiltered && forcedVisibleCount > 0;
  const matchCount = visibleCount - forcedVisibleCount;
  const threadCount = rootThread.children.length;

  return (
    <div className="flex gap-x-1 leading-none">
      {isLoading && <Spinner size="sm" />}
      {!isLoading && (
        <h2 className="font-bold">
          {!hasResults && <span>No results</span>}
          {hasResults && isFiltered && (
            <span>
              {matchCount} {matchCount === 1 ? 'result' : 'results'}
            </span>
          )}
          {hasResults && !isFiltered && (
            <span>
              {threadCount} {threadCount === 1 ? 'thread' : 'threads'}
            </span>
          )}
        </h2>
      )}
      {hasForcedVisible && (
        <h3 className="italic font-normal">(and {forcedVisibleCount} more)</h3>
      )}
      {!isFiltered && hasResults && (
        <h3 className="italic font-normal">
          ({visibleCount} {visibleCount === 1 ? 'annotation' : 'annotations'})
        </h3>
      )}
    </div>
  );
}

export default NotebookResultCount;
