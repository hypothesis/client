import { Link, Panel } from '@hypothesis/frontend-shared/lib/next';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import scrollIntoView from 'scroll-into-view';

import { ResultSizeError } from '../search-client';
import { withServices } from '../service-context';
import type { LoadAnnotationsService } from '../services/load-annotations';
import type { StreamerService } from '../services/streamer';
import { useSidebarStore } from '../store';
import NotebookFilters from './NotebookFilters';
import NotebookResultCount from './NotebookResultCount';
import PaginatedThreadList from './PaginatedThreadList';
import PendingUpdatesButton from './PendingUpdatesButton';
import { useRootThread } from './hooks/use-root-thread';

export type NotebookViewProps = {
  // injected
  loadAnnotationsService: LoadAnnotationsService;
  streamer: StreamerService;
};
/**
 * The main content of the "notebook" route (https://hypothes.is/notebook)
 *
 * @param {NotebookViewProps} props
 */
function NotebookView({ loadAnnotationsService, streamer }: NotebookViewProps) {
  const store = useSidebarStore();

  const filters = store.getFilterValues();
  const focusedGroup = store.focusedGroup();
  const forcedVisibleCount = store.forcedVisibleThreads().length;
  const hasAppliedFilter = store.hasAppliedFilter();
  const isLoading = store.isLoading();
  const resultCount = store.annotationResultCount();

  const rootThread = useRootThread();

  const groupName = focusedGroup?.name ?? '…';

  // Get the ID of the group to fetch annotations from.
  //
  // Once groups have been fetched and one has been focused, use its ID. If
  // groups haven't been fetched yet but we know the ID of the group that is
  // likely to be focused (eg. because the notebook has been configured to
  // display a particular group when launched), we can optimistically fetch
  // annotations from that group.
  const groupId = focusedGroup?.id || store.directLinkedGroupId();

  const lastPaginationPage = useRef(1);
  const [paginationPage, setPaginationPage] = useState(1);

  const [hasTooManyAnnotationsError, setHasTooManyAnnotationsError] =
    useState(false);

  // Load all annotations in the group, unless there are more than 5000
  // of them: this is a performance safety valve.
  const maxResults = 5000;

  const onLoadError = (error: Error) => {
    if (error instanceof ResultSizeError) {
      setHasTooManyAnnotationsError(true);
    }
  };

  const hasFetchedProfile = store.hasFetchedProfile();

  // Establish websocket connection
  useEffect(() => {
    if (hasFetchedProfile) {
      streamer.connect({ applyUpdatesImmediately: false });
    }
  }, [hasFetchedProfile, streamer]);

  // Load all annotations; re-load if `focusedGroup` changes
  useEffect(() => {
    // NB: In current implementation, this will only happen/load once (initial
    // annotation fetch on application startup), as there is no mechanism
    // within the Notebook to change the `focusedGroup`. If the focused group
    // is changed within the sidebar and the Notebook re-opened, an entirely
    // new iFrame/app is created. This will need to be revisited.
    store.setSortKey('Newest');
    if (groupId) {
      loadAnnotationsService.load({
        groupId,
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
        maxResults,
        onError: onLoadError,
        streamFilterBy: 'group',
      });
    }
  }, [loadAnnotationsService, groupId, store]);

  const onChangePage = (newPage: number) => {
    setPaginationPage(newPage);
  };

  // When filter values or focused group are changed, reset pagination to page 1
  useEffect(() => {
    onChangePage(1);
  }, [filters, focusedGroup]);

  // Scroll back to here when pagination page changes
  const threadListScrollTop = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    // TODO: Transition and effects here should be improved
    if (paginationPage !== lastPaginationPage.current) {
      if (threadListScrollTop.current) {
        scrollIntoView(threadListScrollTop.current);
      }
      lastPaginationPage.current = paginationPage;
    }
  }, [paginationPage]);

  return (
    <div className="grid gap-2 lg:grid-cols-2" data-testid="notebook-container">
      <header className="leading-none lg:col-span-2" ref={threadListScrollTop}>
        <h1 className="text-xl font-bold" data-testid="notebook-group-name">
          {groupName}
        </h1>
      </header>
      <div className="justify-self-start">
        <NotebookFilters />
      </div>
      <div className="flex items-center lg:justify-self-end text-md font-medium">
        <PendingUpdatesButton />
        <NotebookResultCount
          forcedVisibleCount={forcedVisibleCount}
          isFiltered={hasAppliedFilter}
          isLoading={isLoading}
          resultCount={resultCount ?? 0}
        />
      </div>
      <div className="lg:col-span-2">
        {hasTooManyAnnotationsError && (
          <div className="py-4" data-testid="notebook-messages">
            <Panel title="Too many results to show">
              <p>
                This preview of the Notebook can show{' '}
                <strong>up to {maxResults} results</strong> at a time (there are{' '}
                {resultCount} to show here).
              </p>
              <p>
                <Link
                  href="mailto:support@hypothes.is?subject=Hypothesis%20Notebook&body=Please%20notify%20me%20when%20the%20Hypothesis%20Notebook%20is%20updated%20to%20support%20more%20than%205000%20annotations"
                  underline="always"
                >
                  Contact us
                </Link>{' '}
                if you would like to be notified when support for more
                annotations is available.
              </p>
            </Panel>
          </div>
        )}
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

export default withServices(NotebookView, [
  'loadAnnotationsService',
  'streamer',
]);
