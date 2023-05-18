/**
 * Filter clause against which annotation updates are tested before being
 * sent to the client.
 */
type FilterClause = {
  field: '/group' | '/id' | '/references' | '/uri';
  operator: 'equals' | 'one_of';
  value: string | string[];

  /**
   * @todo Backend doesn't use this at present, but it seems important for
   *       certain fields (eg. ID).
   */
  case_sensitive: boolean;
};

type Filter = {
  clauses: FilterClause[];

  /**
   * @deprecated
   * @todo Remove this, the backend doesn't use it any more.
   */
  match_policy: string;

  /**
   * @deprecated
   * @todo Remove this, the backend doesn't use it any more.
   */
  actions: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
};

/**
 * Return a filter which matches every update that is visible to the current user.
 */
function defaultFilter(): Filter {
  return {
    match_policy: 'include_any',
    clauses: [],
    actions: {
      create: true,
      update: true,
      delete: true,
    },
  };
}

/**
 * StreamFilter generates JSON-serializable configuration objects that
 * control which real-time updates are received from the annotation service.
 *
 * See https://github.com/hypothesis/h/blob/master/h/streamer/filter.py
 * for the schema.
 */
export class StreamFilter {
  private _filter: Filter;

  constructor() {
    this._filter = defaultFilter();
  }

  /**
   * Add a matching clause to the configuration.
   *
   * @param field - Field to filter by
   * @param operator - How to filter
   * @param value - Value to match
   * @param caseSensitive - Whether matching should be case-sensitive
   */
  addClause(
    field: FilterClause['field'],
    operator: FilterClause['operator'],
    value: FilterClause['value'],
    caseSensitive: FilterClause['case_sensitive'] = false
  ) {
    this._filter.clauses.push({
      field,
      operator,
      value,
      case_sensitive: caseSensitive,
    });
    return this;
  }

  /** Return the JSON-serializable filtering configuration. */
  getFilter() {
    return this._filter;
  }

  /** Reset the configuration to return all updates. */
  resetFilter() {
    this._filter = defaultFilter();
    return this;
  }
}
