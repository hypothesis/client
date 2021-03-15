/**
 * A service for fetching annotations, filtered by document URIs and group.
 */

/**
 * @typedef {import('../search-client').SortBy} SortBy
 * @typedef {import('../search-client').SortOrder} SortOrder
 */

/**
 * @typedef LoadAnnotationOptions
 * @prop {string} groupId
 * @prop {string[]} [uris]
 * @prop {number} [maxResults] - If number of annotations in search results
 *   exceeds this value, do not load annotations (see: `SearchClient`)
 * @prop {SortBy} [sortBy] - Together with `sortOrder`, this controls in what
 *   order annotations are loaded. To minimize visible content changing as
 *   annotations load, `sortBy` and `sortOrder` should be chosen to correlate
 *   with the expected presentation order of annotations/threads in the current
 *   view.
 * @prop {SortOrder} [sortOrder]
 */

import SearchClient from '../search-client';

import { isReply } from '../helpers/annotation-metadata';

// @inject
export default function loadAnnotationsService(
  api,
  store,
  streamer,
  streamFilter
) {
  let searchClient = null;

  /**
   * Load annotations from Hypothesis.
   *
   * The existing set of loaded annotations is cleared before the new set
   * is fetched. If an existing annotation fetch is in progress it is canceled.
   *
   * @param {LoadAnnotationOptions} options
   */
  function load(options) {
    const { groupId, uris } = options;
    store.removeAnnotations(store.savedAnnotations());

    // Cancel previously running search client.
    //
    // This will emit the "end" event for the existing client and trigger cleanup
    // associated with that client (eg. resetting the count of in-flight
    // annotation fetches).
    if (searchClient) {
      searchClient.cancel();
    }

    if (uris && uris.length > 0) {
      streamFilter.resetFilter().addClause('/uri', 'one_of', uris);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
    }

    const searchOptions = {
      incremental: true,
      maxResults: options.maxResults ?? null,
      separateReplies: false,

      // Annotations are fetched in order of creation by default. This is expected
      // to roughly correspond to the order in which threads end up being sorted
      // because:
      //
      // 1. The default thread sort order in the sidebar is by document location
      // 2. When users annotate a document, they will tend to annotate content in
      //    document order. Annotations near the top of the document will
      //    tend to have earlier creation dates.
      //
      // If the backend would allow us to sort on document location, we could do even better.

      sortBy: /** @type {SortBy} */ (options.sortBy ?? 'created'),
      sortOrder: /** @type {SortOrder} */ (options.sortOrder ?? 'asc'),
    };

    searchClient = new SearchClient(api.search, searchOptions);

    searchClient.on('resultCount', resultCount => {
      store.setAnnotationResultCount(resultCount);
    });

    searchClient.on('results', results => {
      if (results.length) {
        store.addAnnotations(results);
      }
    });

    searchClient.on('error', error => {
      console.error(error);
    });

    searchClient.on('end', () => {
      // Remove client as it's no longer active.
      searchClient = null;

      if (uris && uris.length > 0) {
        store.frames().forEach(frame => {
          if (uris.indexOf(frame.uri) >= 0) {
            store.updateFrameAnnotationFetchStatus(frame.uri, true);
          }
        });
      }
      store.annotationFetchFinished();
    });

    store.annotationFetchStarted();

    searchClient.get({ group: groupId, uri: uris });
  }

  /**
   * Fetch all annotations in the same thread as `id` and add them to the store.
   *
   * @param {string} id - Annotation ID. This may be an annotation or a reply.
   * @return Promise<Annotation[]> - The annotation, followed by any replies.
   */
  async function loadThread(id) {
    let annotation;
    let replySearchResult;

    // Clear out any annotations already in the store before fetching new ones
    store.clearAnnotations();

    try {
      store.annotationFetchStarted();
      // 1. Fetch the annotation indicated by `id` — the target annotation
      annotation = await api.annotation.get({ id });

      // 2. If annotation is not the top-level annotation in its thread,
      //    fetch the top-level annotation
      if (isReply(annotation)) {
        annotation = await api.annotation.get({ id: annotation.references[0] });
      }

      // 3. Fetch all of the annotations in the thread, based on the
      //    top-level annotation
      replySearchResult = await api.search({ references: annotation.id });
    } finally {
      store.annotationFetchFinished();
    }
    const threadAnnotations = [annotation, ...replySearchResult.rows];

    store.addAnnotations(threadAnnotations);

    // If we've been successful in retrieving a thread, with a top-level annotation,
    // configure the connection to the real-time update service to send us
    // updates to any of the annotations in the thread.
    if (!isReply(annotation)) {
      streamFilter
        .addClause('/references', 'one_of', annotation.id, true)
        .addClause('/id', 'equals', annotation.id, true);
      streamer.setConfig('filter', { filter: streamFilter.getFilter() });
      streamer.connect();
    }

    return threadAnnotations;
  }

  return {
    load,
    loadThread,
  };
}
