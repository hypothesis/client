/**
 * @typedef Tag
 * @property {string} text - The label of the tag
 * @property {number} count - The number of times this tag has been used.
 * @property {number} updated - The timestamp when this tag was last used.
 */


/**
 * Service for fetching tag suggestions from a tagProvider service
 * and storing data for future suggestions.
 *
 * The injected `tagProvider` service needs to provide `filter` method to
 * fetch tag suggestions matching a query and optional context object.
 *
 * The injected `tagStore` service needs to provide a `store`
 * method to store entered tags.
 */
// @inject
export default function tags(tagProvider, tagStore) {

  /**
   * Return a list of tag suggestions matching `query`.
   *
   * @param {string} query
   * @param {number|null} limit - Optional limit of the results.
   * @return {Tag[]} List of matching tags
   */
  function filter(query,
                  limit = null) {
    return tagProvider.filter(query, limit);
  }

  /**
   * Update the list of stored tag suggestions based on the tags that a user has
   * entered for a given annotation.
   *
   * @param {Tag[]} tags - List of tags.
   */
  function store(tags) {
    return tagStore.store(tags);
  }

  return {
    filter,
    store,
  };
}
