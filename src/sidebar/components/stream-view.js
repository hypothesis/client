import { createElement } from 'preact';
import { useCallback, useEffect } from 'preact/hooks';
import propTypes from 'prop-types';

import * as searchFilter from '../util/search-filter';
import { withServices } from '../util/service-context';
import useRootThread from './hooks/use-root-thread';
import useStore from '../store/use-store';

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
  const addAnnotations = useStore(store => store.addAnnotations);
  const annotationFetchStarted = useStore(
    store => store.annotationFetchStarted
  );
  const annotationFetchFinished = useStore(
    store => store.annotationFetchFinished
  );
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
      try {
        annotationFetchStarted();
        const results = await api.search(queryParams);
        addAnnotations([...results.rows, ...results.replies]);
      } finally {
        annotationFetchFinished();
      }
    },
    [addAnnotations, annotationFetchStarted, annotationFetchFinished, api]
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

  const rootThread = useRootThread();

  return <ThreadList thread={rootThread} />;
}

StreamView.propTypes = {
  api: propTypes.object,
  toastMessenger: propTypes.object,
};

StreamView.injectedProps = ['api', 'toastMessenger'];

export default withServices(StreamView);
