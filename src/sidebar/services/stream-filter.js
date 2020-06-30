/**
 * @typedef {'equals'|'one_of'} Operator
 */

/**
 * Filter clause against which annotation updates are tested before being
 * sent to the client.
 *
 * @typedef FilterClause
 * @prop {string} field
 * @prop {Operator} operator
 * @prop {any} value
 * @prop {boolean} case_sensitive - TODO: Backend doesn't use this at present,
 *   but it seems important for certain fields (eg. ID).
 */

/**
 * @typedef Filter
 * @prop {string} match_policy - TODO: Remove this, the backend doesn't use it any more.
 * @prop {FilterClause[]} clauses
 * @prop {Object} actions - TODO: Remove this, the backend doesn't use it any more.
 *  @prop {boolean} [actions.create]
 *  @prop {boolean} [actions.update]
 *  @prop {boolean} [actions.delete]
 */

/**
 * Return a filter which matches every update that is visible to the current user.
 *
 * @return {Filter}
 */
function defaultFilter() {
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
export default class StreamFilter {
  constructor() {
    this.filter = defaultFilter();
  }

  /**
   * Add a matching clause to the configuration.
   *
   * @param {string} field - Field to filter by
   * @param {Operator} operator - How to filter
   * @param {any} value - Value to match
   * @param {boolean} caseSensitive - Whether matching should be case sensitive
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
    this.filter = defaultFilter();
    return this;
  }
}
