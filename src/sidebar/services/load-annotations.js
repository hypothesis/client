/**
 * A service for fetching annotations, filtered by document URIs and group.
 */

/**
 * @typedef LoadAnnotationOptions
 * @prop {string} groupId
 * @prop {string[]} [uris]
 * @prop {number} [maxResults] - If number of annotations in search results
 *   exceeds this value, do not load annotations (see: `SearchClient`)
 */

import SearchClient from '../search-client';

import { isReply } from '../util/annotation-metadata';

// @inject
export default function loadAnnotationsService(
  api,
  store,
  streamer,
  streamFilter
) {
  let searchClient = null;

  /**
   * Load annotations
   *
   * @param {LoadAnnotationOptions} options
   */
  function load(options) {
    const { groupId, uris } = options;
    store.removeAnnotations(store.savedAnnotations());

    // Cancel previously running search client.
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
    };

    searchClient = new SearchClient(api.search, searchOptions);

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
