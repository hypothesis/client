import escapeStringRegexp from 'escape-string-regexp';

import type { LocalStorageService } from './local-storage';

type Tag = {
  /** The label of the tag */
  text: string;
  /** The number of times this tag has been used. */
  count: number;
  /** The timestamp when this tag was last used. */
  updated: number;
};

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
  private _storage: LocalStorageService;

  /**
   * @param localStorage - Storage used to persist the tags
   */
  constructor(localStorage: LocalStorageService) {
    this._storage = localStorage;
  }

  /**
   * Return a list of tag suggestions matching `query`.
   *
   * @param limit - Optional limit of the results.
   * @return List of matching tags
   */
  filter(query: string, limit: number | null = null): string[] {
    const savedTags = this._storage.getObject<string[]>(TAGS_LIST_KEY) || [];
    let resultCount = 0;
    // Match any tag where the query is a prefix of the tag or a word within the tag.
    return savedTags.filter(tag => {
      if (limit !== null && resultCount >= limit) {
        // limit allows a subset of the results
        // See https://github.com/hypothesis/client/issues/1606
        return false;
      }
      // Split the string on words. An improvement would be to use a unicode word boundary
      // algorithm implemented by the browser (when available).
      // https://unicode.org/reports/tr29/#Word_Boundaries
      const words = tag.split(/\W+/);
      const regex = new RegExp(`^${escapeStringRegexp(query)}`, 'i'); // Only match the start of the string
      const matches = words.some(word => word.match(regex)) || tag.match(regex);
      if (matches) {
        ++resultCount;
        return true;
      }
      return false;
    });
  }

  /**
   * Update the list of stored tag suggestions based on the tags that a user has
   * entered for a given annotation.
   */
  store(tags: string[]) {
    // Update the stored (tag, frequency) map.
    const savedTags =
      this._storage.getObject<Record<string, Tag>>(TAGS_MAP_KEY) || {};
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
