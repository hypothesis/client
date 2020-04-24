import { createElement } from 'preact';
import { useCallback, useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

import { withServices } from '../util/service-context';
import useStore from '../store/use-store';

import ThreadList from './thread-list';

/**
 * The main content of the "stream" route (https://hypothes.is/stream)
 */
function StreamContent({
  api,
  rootThread: rootThreadService,
  searchFilter,
  toastMessenger,
}) {
  const addAnnotations = useStore(store => store.addAnnotations);
  const clearAnnotations = useStore(store => store.clearAnnotations);
  const currentQuery = useStore(store => store.routeParams().q);
  const setSortKey = useStore(store => store.setSortKey);

  /**
   * Fetch annotations from the API and display them in the stream.
   *
   * @param {string} query - The user-supplied search query
   */
  const loadAnnotations = useCallback(
    async query => {
      const queryParams = {
        _separate_replies: true,

        // nb. There is currently no way to load anything except the first
        // 20 matching annotations in the UI.
        offset: 0,
        limit: 20,

        ...searchFilter.toObject(query),
      };
      const results = await api.search(queryParams);
      addAnnotations([...results.rows, ...results.replies]);
    },
    [addAnnotations, api, searchFilter]
  );

  // Update the stream when this route is initially displayed and whenever
  // the search query is updated.
  useEffect(() => {
    // Sort the stream so that the newest annotations are at the top
    setSortKey('Newest');
    clearAnnotations();
    loadAnnotations(currentQuery).catch(err => {
      toastMessenger.error(`Unable to fetch annotations: ${err.message}`);
    });
  }, [
    clearAnnotations,
    currentQuery,
    loadAnnotations,
    setSortKey,
    toastMessenger,
  ]);

  const rootThread = useStore(store =>
    rootThreadService.thread(store.getState())
  );

  return <ThreadList thread={rootThread} />;
}

StreamContent.propTypes = {
  // Injected services.
  api: propTypes.object,
  rootThread: propTypes.object,
  searchFilter: propTypes.object,
  toastMessenger: propTypes.object,
};

StreamContent.injectedProps = [
  'api',
  'rootThread',
  'searchFilter',
  'toastMessenger',
];

export default withServices(StreamContent);
