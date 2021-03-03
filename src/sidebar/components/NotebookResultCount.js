import propTypes from 'prop-types';

import useRootThread from './hooks/use-root-thread';
import { countVisible } from '../helpers/thread';

import Spinner from './Spinner';

/**
 * @typedef NotebookResultCountProps
 * @prop {number} forcedVisibleCount
 * @prop {boolean} isFiltered
 * @prop {boolean} isLoading
 * @prop {number} resultCount
 */

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
}) {
  const rootThread = useRootThread();
  const visibleCount = isLoading ? resultCount : countVisible(rootThread);

  const hasResults = rootThread.children.length > 0;

  const hasForcedVisible = isFiltered && forcedVisibleCount > 0;
  const matchCount = visibleCount - forcedVisibleCount;
  const threadCount = rootThread.children.length;

  // When filters are applied, display a count of matching annotations.
  // When not filtered, display a count of top-level threads.
  // This is consistent with the sidebar
  const displayCount = isFiltered ? matchCount : threadCount;

  return (
    <div className="NotebookResultCount u-layout-row">
      {isLoading && <Spinner />}
      {!isLoading && (
        <h2>
          {!hasResults && <strong>No results</strong>}
          {hasResults && (
            <strong>
              {displayCount} {displayCount === 1 ? 'result' : 'results'}
            </strong>
          )}
        </h2>
      )}
      {hasForcedVisible && <h3>(and {forcedVisibleCount} more)</h3>}
    </div>
  );
}

NotebookResultCount.propTypes = {
  forcedVisibleCount: propTypes.number,
  isFiltered: propTypes.bool,
  isLoading: propTypes.bool,
  resultCount: propTypes.number,
};

export default NotebookResultCount;
