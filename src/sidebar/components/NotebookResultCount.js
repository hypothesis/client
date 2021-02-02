import propTypes from 'prop-types';

import useRootThread from './hooks/use-root-thread';
import { countVisible } from '../helpers/thread';

import Spinner from './Spinner';

/**
 * @typedef NotebookResultCountProps
 * @prop {number} currentPage
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
  currentPage,
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

  return (
    <div className="NotebookResultCount u-layout-row">
      {isLoading && <Spinner />}
      {!isLoading && (
        <h2>
          {currentPage > 1 && <span>Page {currentPage} of </span>}
          {!hasResults && <em>No results</em>}
          {hasResults && isFiltered && (
            <em>
              {matchCount} {matchCount === 1 ? 'result' : 'results'}
            </em>
          )}
          {hasResults && !isFiltered && (
            <em>
              {threadCount} {threadCount === 1 ? 'thread' : 'threads'}
            </em>
          )}
        </h2>
      )}
      {hasForcedVisible && <h3>(and {forcedVisibleCount} more)</h3>}
      {!isFiltered && hasResults && (
        <h3>
          ({visibleCount} {visibleCount === 1 ? 'annotation' : 'annotations'})
        </h3>
      )}
    </div>
  );
}

NotebookResultCount.propTypes = {
  currentPage: propTypes.number,
  forcedVisibleCount: propTypes.number,
  isFiltered: propTypes.bool,
  isLoading: propTypes.bool,
  resultCount: propTypes.number,
};

export default NotebookResultCount;
