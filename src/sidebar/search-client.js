import { TinyEmitter } from 'tiny-emitter';

/**
 * @typedef {import('../types/api').Annotation} Annotation
 */

/**
 * Client for the Hypothesis search API.
 *
 * SearchClient handles paging through results, canceling search etc.
 */
export default class SearchClient extends TinyEmitter {
  /**
   * @param {Object} searchFn - Function for querying the search API
   * @param {Object} options
   *   @param {number} [options.chunkSize] - page size/number of annotations
   *   per batch
   *   @param {boolean} [options.separateReplies] - When `true`, request that
   *   top-level annotations and replies be returned separately.
   *   NOTE: This has issues with annotations that have large numbers of
   *   replies.
   *   @param {boolean} [options.incremental] - Emit `results` events incrementally
   *   as batches of annotations are available
   *   @param {number|null} [options.maxResults] - Safety valve for protection when
   *   loading all annotations in a group in the NotebookView. If the Notebook
   *   is opened while focused on a group that contains many thousands of
   *   annotations, it could cause rendering and network misery in the browser.
   *   When present, do not load annotations if the result set size exceeds
   *   this value.
   */
  constructor(
    searchFn,
    {
      chunkSize = 200,
      separateReplies = true,
      incremental = true,
      maxResults = null,
    } = {}
  ) {
    super();
    this._searchFn = searchFn;
    this._chunkSize = chunkSize;
    this._separateReplies = separateReplies;
    this._incremental = incremental;
    this._maxResults = maxResults;

    this._canceled = false;
    /** @type {Annotation[]} */
    this._results = [];
  }

  _getBatch(query, offset) {
    const searchQuery = Object.assign(
      {
        limit: this._chunkSize,
        offset: offset,
        sort: 'created',
        order: 'asc',
        _separate_replies: this._separateReplies,
      },
      query
    );

    const self = this;
    this._searchFn(searchQuery)
      .then(function (results) {
        if (self._canceled) {
          return;
        }

        // For now, abort loading of annotations if `maxResults` is set and the
        // number of annotations in the results set exceeds that value.
        //
        // NB: We can’t currently, reliably load a subset of a group’s
        // annotations, as replies are mixed in with top-level annotations—when
        // `separateReplies` is false, which it is in most or all cases—so we’d
        // end up with partially-loaded threads.
        //
        // This change has no effect on loading annotations in the SidebarView,
        // where the `maxResults` option is not used.
        //
        // TODO: Implement pagination
        if (self._maxResults && results.total > self._maxResults) {
          self.emit(
            'error',
            new Error('Results size exceeds maximum allowed annotations')
          );
          self.emit('end');
          return;
        }

        const chunk = results.rows.concat(results.replies || []);
        if (self._incremental) {
          self.emit('results', chunk);
        } else {
          self._results = self._results.concat(chunk);
        }

        // Check if there are additional pages of results to fetch. In addition to
        // checking the `total` figure from the server, we also require that at
        // least one result was returned in the current page, otherwise we would
        // end up repeating the same query for the next page. If the server's
        // `total` count is incorrect for any reason, that will lead to the client
        // polling the server indefinitely.
        const nextOffset = offset + results.rows.length;
        if (results.total > nextOffset && chunk.length > 0) {
          self._getBatch(query, nextOffset);
        } else {
          if (!self._incremental) {
            self.emit('results', self._results);
          }
          self.emit('end');
        }
      })
      .catch(function (err) {
        if (self._canceled) {
          return;
        }
        self.emit('error', err);
        self.emit('end');
      });
  }

  /**
   * Perform a search against the Hypothesis API.
   *
   * Emits a 'results' event with an array of annotations as they become
   * available (in incremental mode) or when all annotations are available
   * (in non-incremental mode).
   *
   * Emits an 'error' event if the search fails.
   * Emits an 'end' event once the search completes.
   */
  get(query) {
    this._results = [];
    this._getBatch(query, 0);
  }

  /**
   * Cancel the current search and emit the 'end' event.
   * No further events will be emitted after this.
   */
  cancel() {
    this._canceled = true;
    this.emit('end');
  }
}
