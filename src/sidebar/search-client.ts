import { TinyEmitter } from 'tiny-emitter';

import type { Annotation, SearchQuery, SearchResponse } from '../types/api';

/**
 * Indicates that there are more annotations matching the current API
 * search request than the interface can currently handle displaying
 * (Notebook).
 */
export class ResultSizeError extends Error {
  constructor(limit: number) {
    super(`Results size exceeds ${limit}`);
  }
}

export type SortBy = 'created' | 'updated';

export type SortOrder = 'asc' | 'desc';

/**
 * Default implementation of {@link SearchOptions.getPageSize}.
 *
 * This uses a small number for the first page to reduce the time until some
 * results are displayed and a larger number for remaining pages to lower the
 * total fetch time.
 */
function defaultPageSize(index: number) {
  return index === 0 ? 50 : 200;
}

export type SearchOptions = {
  /**
   * Callback that returns the page size to use when fetching the index'th page
   * of results.  Callers can vary this to balance the latency of getting some
   * results against the time taken to fetch all results.
   *
   * The returned page size must be at least 1 and no more than the maximum
   * value of the `limit` query param for the search API.
   */
  getPageSize?: (index: number) => number;

  /**
   * When `true`, request that top-level annotations and replies be returned
   * separately. NOTE: This has issues with annotations that have large numbers
   * of replies.
   */
  separateReplies?: boolean;

  /** Emit `results` events incrementally as pages of annotations are fetched. */
  incremental?: boolean;

  /**
   * Safety valve for protection when loading all annotations in a group in the
   * NotebookView. If the Notebook is opened while focused on a group that
   * contains many thousands of annotations, it could cause rendering and
   * network misery in the browser.  When present, do not load annotations if
   * the result set size exceeds this value.
   */
  maxResults?: number | null;

  /**
   * Specifies which annotation field to sort results by. Together with
   * {@link SearchOptions.sortOrder} this controls how the results are ordered.
   */
  sortBy?: SortBy;

  sortOrder?: SortOrder;
};

/**
 * Client for the Hypothesis annotation search API [1].
 *
 * SearchClient does not directly call the `/api/search` endpoint, but uses a
 * consumer-provided callback for that. What it does handle is generating query
 * params for the API call, paging through results and emitting events as
 * results are received.
 *
 * [1] https://h.readthedocs.io/en/latest/api-reference/#tag/annotations/paths/~1search/get
 */
export class SearchClient extends TinyEmitter {
  private _canceled: boolean;
  private _getPageSize: (pageIndex: number) => number;
  private _incremental: boolean;
  private _maxResults: number | null;

  /** Total number of results we expect to receive, from the `total` field. */
  private _expectedCount: null | number;

  /** Total number of results we have received. */
  private _fetchedCount: number;

  /** Results received so far, if we are not emitting results incrementally. */
  private _results: Annotation[];

  private _searchFn: (query: SearchQuery) => Promise<SearchResponse>;
  private _separateReplies: boolean;
  private _sortBy: SortBy;
  private _sortOrder: SortOrder;

  /**
   * @param searchFn - Callback that executes a search request against the Hypothesis API
   */
  constructor(
    searchFn: (query: SearchQuery) => Promise<SearchResponse>,
    {
      getPageSize = defaultPageSize,
      separateReplies = true,
      incremental = true,
      maxResults = null,
      sortBy = 'created',
      sortOrder = 'asc',
    }: SearchOptions = {},
  ) {
    super();
    this._searchFn = searchFn;
    this._getPageSize = getPageSize;
    this._separateReplies = separateReplies;
    this._incremental = incremental;
    this._maxResults = maxResults;
    this._sortBy = sortBy;
    this._sortOrder = sortOrder;

    this._canceled = false;
    this._expectedCount = null;
    this._fetchedCount = 0;
    this._results = [];
  }

  /**
   * Fetch a page of annotations.
   *
   * @param query - Query params for /api/search call
   * @param [searchAfter] - Cursor value to use when paginating
   *   through results. Omitted for the first page. See docs for `search_after`
   *   query param for /api/search API.
   */
  async _getPage(query: SearchQuery, searchAfter?: string, pageIndex = 0) {
    const pageSize = this._getPageSize(pageIndex);

    const searchQuery: SearchQuery = {
      limit: pageSize,
      sort: this._sortBy,
      order: this._sortOrder,
      _separate_replies: this._separateReplies,

      ...query,
    };

    if (searchAfter) {
      searchQuery.search_after = searchAfter;
    }

    try {
      const results = await this._searchFn(searchQuery);
      if (this._canceled) {
        return;
      }

      if (this._expectedCount === null) {
        // Emit the result count (total) on first encountering it
        this._expectedCount = results.total;
        this.emit('resultCount', this._expectedCount);
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
      if (this._maxResults && results.total > this._maxResults) {
        this.emit('error', new ResultSizeError(this._maxResults));
        this.emit('end');
        return;
      }

      const page = results.rows.concat(results.replies || []);

      if (this._incremental) {
        this.emit('results', page);
      } else {
        this._results = this._results.concat(page);
      }
      this._fetchedCount += page.length;

      // Check if we're expecting more results. If the `total` value from the
      // API is "small" it will be exact. If large, it may be a lower bound, in
      // which case we'll keep fetching until we get no more. Calculating this
      // is just an optimization to reduce the number of search API calls and
      // make the loading state disappear sooner.
      //
      // See also https://www.elastic.co/guide/en/elasticsearch/reference/7.17/search-your-data.html#track-total-hits.
      const expectMore =
        this._fetchedCount < this._expectedCount || this._expectedCount > 1000;

      // Get the cursor for the start of the next page.
      //
      // Ideally this would be part of the API response (see
      // https://github.com/hypothesis/h/issues/7841), but since it isn't yet,
      // we have to construct this ourselves.
      let nextSearchAfter = null;
      if (page.length > 0 && expectMore) {
        nextSearchAfter = page[page.length - 1][this._sortBy];
      }

      if (nextSearchAfter) {
        this._getPage(query, nextSearchAfter, pageIndex + 1);
      } else {
        if (!this._incremental) {
          this.emit('results', this._results);
        }
        this.emit('end');
      }
    } catch (err) {
      if (this._canceled) {
        return;
      }
      this.emit('error', err);
      this.emit('end');
    }
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
  get(query: SearchQuery) {
    this._expectedCount = null;
    this._fetchedCount = 0;
    this._results = [];
    this._getPage(query);
  }

  /**
   * Cancel the current search and emit the 'end' event.
   *
   * No further events will be emitted after this.
   */
  cancel() {
    this._canceled = true;
    this.emit('end');
  }
}
