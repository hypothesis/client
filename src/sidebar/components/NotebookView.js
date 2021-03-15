import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import scrollIntoView from 'scroll-into-view';

import { withServices } from '../service-context';
import useRootThread from './hooks/use-root-thread';
import { useStoreProxy } from '../store/use-store';

import NotebookFilters from './NotebookFilters';
import NotebookResultCount from './NotebookResultCount';

import PaginatedThreadList from './PaginatedThreadList';

/**
 * @typedef NotebookViewProps
 * @prop {Object} [loadAnnotationsService] - Injected service
 */

/**
 * The main content of the "notebook" route (https://hypothes.is/notebook)
 *
 * @param {NotebookViewProps} props
 */
function NotebookView({ loadAnnotationsService }) {
  const store = useStoreProxy();

  const filters = store.getFilterValues();
  const focusedGroup = store.focusedGroup();
  const forcedVisibleCount = store.forcedVisibleThreads().length;
  const hasAppliedFilter = store.hasAppliedFilter();
  const isLoading = store.isLoading();
  const resultCount = store.annotationResultCount();

  const rootThread = useRootThread();

  const groupName = focusedGroup?.name ?? '…';

  // Get the ID of the group to fetch annotations from. Once groups are fetched
  // this is the same as the focused group ID. In the case where the notebook
  // is configured to open with a specific group we can start fetching annotations
  // sooner, without waiting for the group fetch to complete, by falling back
  // to the initially-configured group.
  const groupId = focusedGroup?.id || store.directLinkedGroupId();

  const lastPaginationPage = useRef(1);
  const [paginationPage, setPaginationPage] = useState(1);

  // Load all annotations; re-load if `focusedGroup` changes
  useEffect(() => {
    // Load all annotations in the group, unless there are more than 5000
    // of them: this is a performance safety valve.

    // NB: In current implementation, this will only happen/load once (initial
    // annotation fetch on application startup), as there is no mechanism
    // within the Notebook to change the `focusedGroup`. If the focused group
    // is changed within the sidebar and the Notebook re-opened, an entirely
    // new iFrame/app is created. This will need to be revisited.
    store.setSortKey('Newest');
    if (groupId) {
      loadAnnotationsService.load({
        groupId,
        maxResults: 5000,

        // Load annotations in reverse-chronological order because that is how
        // threads are sorted in the notebook view. By aligning the fetch
        // order with the thread display order we reduce the changes in visible
        // content as annotations are loaded. This reduces the amount of time
        // the user has to wait for the content to load before they can start
        // reading it.
        //
        // Fetching is still suboptimal because we fetch both annotations and
        // replies together from the backend, but the user initially sees only
        // the top-level threads.
        sortBy: 'updated',
        sortOrder: 'desc',
      });
    }
  }, [loadAnnotationsService, groupId, store]);

  // Pagination-page-changing callback
  const onChangePage = newPage => {
    setPaginationPage(newPage);
  };

  // When filter values or focused group are changed, reset pagination to page 1
  useEffect(() => {
    onChangePage(1);
  }, [filters, focusedGroup]);

  // Scroll back to here when pagination page changes
  const threadListScrollTop = useRef(/** @type {HTMLElement|null}*/ (null));
  useLayoutEffect(() => {
    // TODO: Transition and effects here should be improved
    if (paginationPage !== lastPaginationPage.current) {
      scrollIntoView(threadListScrollTop.current);
      lastPaginationPage.current = paginationPage;
    }
  }, [paginationPage]);

  return (
    <div className="NotebookView">
      <header className="NotebookView__heading" ref={threadListScrollTop}>
        <h1 className="NotebookView__group-name">{groupName}</h1>
      </header>
      <div className="NotebookView__filters">
        <NotebookFilters />
      </div>
      <div className="NotebookView__results">
        <NotebookResultCount
          forcedVisibleCount={forcedVisibleCount}
          isFiltered={hasAppliedFilter}
          isLoading={isLoading}
          resultCount={resultCount}
        />
      </div>
      <div className="NotebookView__items">
        <PaginatedThreadList
          currentPage={paginationPage}
          isLoading={isLoading}
          onChangePage={onChangePage}
          threads={rootThread.children}
        />
      </div>
    </div>
  );
}

NotebookView.injectedProps = ['loadAnnotationsService'];

export default withServices(NotebookView);
