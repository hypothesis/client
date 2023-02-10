import { useCallback, useEffect } from 'preact/hooks';

import { withServices } from '../service-context';
import type { APIService } from '../services/api';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import * as searchFilter from '../util/search-filter';
import ThreadList from './ThreadList';
import { useRootThread } from './hooks/use-root-thread';

export type StreamViewProps = {
  // injected
  api: APIService;
  toastMessenger: ToastMessengerService;
};

/**
 * The main content of the "stream" route (https://hypothes.is/stream)
 */
function StreamView({ api, toastMessenger }: StreamViewProps) {
  const store = useSidebarStore();
  const currentQuery = store.routeParams().q;

  /**
   * Fetch annotations from the API and display them in the stream.
   */
  const loadAnnotations = useCallback(
    async (query: string) => {
      const queryParams = {
        _separate_replies: true,

        // nb. There is currently no way to load anything except the first
        // 20 matching annotations in the UI.
        offset: 0,
        limit: 20,

        ...searchFilter.toObject(query),
      };
      try {
        store.annotationFetchStarted();
        const results = await api.search(queryParams);
        store.addAnnotations([...results.rows, ...results.replies]);
      } finally {
        store.annotationFetchFinished();
      }
    },
    [api, store]
  );

  // Update the stream when this route is initially displayed and whenever
  // the search query is updated.
  useEffect(() => {
    // Sort the stream so that the newest annotations are at the top
    store.setSortKey('Newest');
    store.clearAnnotations();
    loadAnnotations(currentQuery).catch(err => {
      toastMessenger.error(`Unable to fetch annotations: ${err.message}`);
    });
  }, [currentQuery, loadAnnotations, store, toastMessenger]);

  const rootThread = useRootThread();

  return <ThreadList threads={rootThread.children} />;
}

export default withServices(StreamView, ['api', 'toastMessenger']);
