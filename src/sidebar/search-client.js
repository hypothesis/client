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
   */
  constructor(
    searchFn,
    { chunkSize = 200, separateReplies = true, incremental = true } = {}
  ) {
    super();
    this._searchFn = searchFn;
    this._chunkSize = chunkSize;
    this._separateReplies = separateReplies;
    this._incremental = incremental;

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
