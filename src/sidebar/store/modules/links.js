import { replaceURLParams } from '../../util/url';
import { createStoreModule, makeAction } from '../create-store';

const initialState = /** @type {Record<string, string>|null} */ (null);

/** @typedef {typeof initialState} State */

const reducers = {
  /**
   * @param {State} state
   * @param {{ links: Record<string, string> }} action
   */
  UPDATE_LINKS(state, action) {
    return {
      ...action.links,
    };
  },
};

/**
 * Update the link map
 *
 * @param {Record<string, string>} links - Link map fetched from the `/api/links` endpoint
 */
function updateLinks(links) {
  return makeAction(reducers, 'UPDATE_LINKS', { links });
}

/**
 * Render a service link (URL) using the given `params`
 *
 * Returns an empty string if links have not been fetched yet.
 *
 * @param {State} state
 * @param {string} linkName
 * @param {Record<string, string>} [params]
 */
function getLink(state, linkName, params = {}) {
  if (!state) {
    return '';
  }
  const template = state[linkName];
  if (!template) {
    throw new Error(`Unknown link "${linkName}"`);
  }
  const { url, unusedParams } = replaceURLParams(template, params);
  const unusedKeys = Object.keys(unusedParams);
  if (unusedKeys.length > 0) {
    throw new Error(`Unused parameters: ${unusedKeys.join(', ')}`);
  }
  return url;
}

export const linksModule = createStoreModule(initialState, {
  namespace: 'links',
  reducers,
  actionCreators: {
    updateLinks,
  },
  selectors: {
    getLink,
  },
});
