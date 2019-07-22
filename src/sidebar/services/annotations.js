'use strict';

const SearchClient = require('../search-client');

// @ngInject
function annotations(annotationMapper, api, store, streamer, streamFilter) {
  let searchClient = null;

  /**
   * Load annotations for all URIs and groupId.
   *
   * @param {string[]} uris
   * @param {string} groupId
   */
  function load(uris, groupId) {
    annotationMapper.unloadAnnotations(store.savedAnnotations());

    // Cancel previously running search client.
    if (searchClient) {
      searchClient.cancel();
    }

    if (uris.length > 0) {
      searchAndLoad(uris, groupId);

      streamFilter.resetFilter().addClause('/uri', 'one_of', uris);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    }
  }

  function searchAndLoad(uris, groupId) {
    searchClient = new SearchClient(api.search, {
      incremental: true,
    });
    searchClient.on('results', results => {
      if (results.length) {
        annotationMapper.loadAnnotations(results);
      }
    });
    searchClient.on('error', error => {
      console.error(error);
    });
    searchClient.on('end', () => {
      // Remove client as it's no longer active.
      searchClient = null;

      store.frames().forEach(function(frame) {
        if (0 <= uris.indexOf(frame.uri)) {
          store.updateFrameAnnotationFetchStatus(frame.uri, true);
        }
      });
      store.annotationFetchFinished();
    });
    store.annotationFetchStarted();
    searchClient.get({ uri: uris, group: groupId });
  }

  return {
    load,
  };
}

module.exports = annotations;
