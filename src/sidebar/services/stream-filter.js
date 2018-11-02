'use strict';

/**
 * StreamFilter generates JSON-serializable configuration objects that
 * control which real-time updates are received from the annotation service.
 *
 * See https://github.com/hypothesis/h/blob/master/h/streamer/filter.py
 * for the schema.
 */
class StreamFilter {
  constructor() {
    this.resetFilter();
  }

  /**
   * Add a matching clause to the configuration.
   *
   * @param field - Field to filter by
   * @param operator - How to filter
   * @param value - Value to match
   * @param caseSensitive - Whether matching should be case sensitive
   */
  addClause(field, operator, value, caseSensitive = false) {
    this.filter.clauses.push({
      field,
      operator,
      value,
      case_sensitive: caseSensitive,
    });
    return this;
  }

  /** Return the JSON-serializable filtering configuration. */
  getFilter() {
    return this.filter;
  }

  /** Reset the configuration to return all updates. */
  resetFilter() {
    this.filter = {
      match_policy: 'include_any',
      clauses: [],
      actions: {
        create: true,
        update: true,
        delete: true,
      },
    };
    return this;
  }
}

module.exports = StreamFilter;
