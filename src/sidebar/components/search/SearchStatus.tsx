import classnames from 'classnames';
import { useMemo } from 'preact/hooks';

import { countVisible } from '../../helpers/thread';
import { useSidebarStore } from '../../store';
import { useRootThread } from '../hooks/use-root-thread';

export default function SearchStatus() {
  const store = useSidebarStore();
  const rootThread = useRootThread();

  const filterQuery = store.filterQuery();
  const forcedVisibleCount = store.forcedVisibleThreads().length;

  // Number of items that match current search query
  const resultCount = useMemo(
    () => countVisible(rootThread) - forcedVisibleCount,
    [rootThread, forcedVisibleCount],
  );

  return (
    <div
      // This container element needs to be present at all times but
      // should only be visible when there are applied filters
      className={classnames('mb-1 flex items-center justify-center space-x-1', {
        'sr-only': !filterQuery,
      })}
      data-testid="search-status-container"
    >
      <div
        className={classnames(
          // Setting `min-width: 0` here allows wrapping to work as
          // expected for long `filterQuery` strings. See
          // https://css-tricks.com/flexbox-truncated-text/
          'grow min-w-[0]',
        )}
        role="status"
      >
        {filterQuery && (
          <>
            {resultCount > 0 && <span>Showing </span>}
            <span className="whitespace-nowrap font-bold">
              {resultCount > 0 ? resultCount : 'No'}{' '}
              {resultCount === 1 ? 'result' : 'results'}
            </span>
            <span>
              {' '}
              for <span className="break-words">{`'${filterQuery}'`}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
