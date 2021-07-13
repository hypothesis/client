/**
 * @typedef Tag
 * @property {string} text - The label of the tag
 * @property {number} count - The number of times this tag has been used.
 * @property {number} updated - The timestamp when this tag was last used.
 */

const TAGS_LIST_KEY = 'hypothesis.user.tags.list';
const TAGS_MAP_KEY = 'hypothesis.user.tags.map';

/**
 * Service for fetching tag suggestions and storing data to generate them.
 *
 * The `tags` service stores metadata about recently used tags to local storage
 * and provides a `filter` method to fetch tags matching a query, ranked based
 * on frequency of usage.
 */
// @inject
export class TagsService {
  /**
   * @param {import('./local-storage').LocalStorageService} localStorage -
   *   Storage used to persist the tags
   */
  constructor(localStorage) {
    this._storage = localStorage;
  }

  /**
   * Return a list of tag suggestions matching `query`.
   *
   * @param {string} query
   * @param {number|null} limit - Optional limit of the results.
   * @return {string[]} List of matching tags
   */
  filter(query, limit = null) {
    const savedTags = this._storage.getObject(TAGS_LIST_KEY) || [];
    let resultCount = 0;
    // query will match tag if:
    // * tag starts with query (e.g. tag "banana" matches query "ban"), OR
    // * any word in the tag starts with query
    //   (e.g. tag "pink banana" matches query "ban"), OR
    // * tag has substring query occurring after a non-word character
    //   (e.g. tag "pink!banana" matches query "ban")
    return savedTags.filter(tag => {
      const words = tag.split(/\W+/);
      let regex = new RegExp(`^${query}`, 'i'); // Only match the start of the string
      // limit allows a subset of the results
      // See https://github.com/hypothesis/client/issues/1606
      if (limit === null || resultCount < limit) {
        const matches =
          words.some(word => word.match(regex)) || tag.match(regex);
        if (matches) {
          ++resultCount;
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Update the list of stored tag suggestions based on the tags that a user has
   * entered for a given annotation.
   *
   * @param {string[]} tags - List of tags.
   */
  store(tags) {
    // Update the stored (tag, frequency) map.
    const savedTags = this._storage.getObject(TAGS_MAP_KEY) || {};
    tags.forEach(tag => {
      if (savedTags[tag]) {
        savedTags[tag].count += 1;
        savedTags[tag].updated = Date.now();
      } else {
        savedTags[tag] = {
          text: tag,
          count: 1,
          updated: Date.now(),
        };
      }
    });
    this._storage.setObject(TAGS_MAP_KEY, savedTags);

    // Sort tag suggestions by frequency.
    const tagsList = Object.keys(savedTags).sort((t1, t2) => {
      if (savedTags[t1].count !== savedTags[t2].count) {
        return savedTags[t2].count - savedTags[t1].count;
      }
      return t1.localeCompare(t2);
    });
    this._storage.setObject(TAGS_LIST_KEY, tagsList);
  }
}
