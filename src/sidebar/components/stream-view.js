import { createElement } from 'preact';
import { useCallback, useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

import * as searchFilter from '../util/search-filter';
import { withServices } from '../util/service-context';
import useRootThread from './hooks/use-root-thread';
import { useStoreProxy } from '../store/use-store';

import ThreadList from './thread-list';

/**
 * @typedef StreamViewProps
 * @prop {Object} [api] - Injected service
 * @prop {Object} [toastMessenger] - Injected service
 */

/**
 * The main content of the "stream" route (https://hypothes.is/stream)
 *
 * @param {StreamViewProps} props
 */
function StreamView({ api, toastMessenger }) {
  const store = useStoreProxy();
  const currentQuery = store.routeParams().q;

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

  return <ThreadList thread={rootThread} />;
}

StreamView.propTypes = {
  api: propTypes.object,
  toastMessenger: propTypes.object,
};

StreamView.injectedProps = ['api', 'toastMessenger'];

export default withServices(StreamView);
