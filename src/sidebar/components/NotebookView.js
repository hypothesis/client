import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import propTypes from 'prop-types';
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
    if (focusedGroup) {
      loadAnnotationsService.load({
        groupId: focusedGroup.id,
        maxResults: 5000,
      });
      setPaginationPage(1);
    }
  }, [loadAnnotationsService, focusedGroup, store]);

  // Pagination-page-changing callback
  const onChangePage = newPage => {
    setPaginationPage(newPage);
  };

  // When filter values are changed in any way, reset pagination to page 1
  useEffect(() => {
    onChangePage(1);
  }, [filters]);

  // Scroll back to here when pagination page changes
  const threadListScrollTop = useRef(/** @type {HTMLElement|null}*/ (null));

  useLayoutEffect(() => {
    // If pagination page has changed, scroll to top of list of page of threads
    // to semi-represent a new page load
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
          currentPage={paginationPage}
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

NotebookView.propTypes = {
  loadAnnotationsService: propTypes.object,
};

NotebookView.injectedProps = ['loadAnnotationsService'];

export default withServices(NotebookView);
