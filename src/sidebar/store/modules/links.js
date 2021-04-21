import { actionTypes } from '../util';
import { replaceURLParams } from '../../util/url';
import { storeModule } from '../create-store';

function init() {
  return null;
}

const update = {
  UPDATE_LINKS(state, action) {
    return {
      ...action.newLinks,
    };
  },
};

const actions = actionTypes(update);

/**
 * Update links
 *
 * @param {object} newLinks - Link map returned by the `/api/links` endpoint
 */
function updateLinks(newLinks) {
  return {
    type: actions.UPDATE_LINKS,
    newLinks,
  };
}

/**
 * Render a service link (URL) using the given `params`
 *
 * Returns an empty string if links have not been fetched yet.
 *
 * @param {string} linkName
 * @param {Record<string,string>} params
 * @return {string}
 */
function getLink(state, linkName, params = {}) {
  if (!state) {
    return '';
  }
  const template = state[linkName];
  if (!template) {
    throw new Error(`Unknown link "${linkName}"`);
  }
  const { url, params: unusedParams } = replaceURLParams(template, params);
  if (Object.keys(unusedParams).length > 0) {
    throw new Error(
      `Unused parameters: ${Object.keys(unusedParams).join(', ')}`
    );
  }
  return url;
}

export default storeModule({
  init,
  namespace: 'links',
  update,
  actions: {
    updateLinks,
  },
  selectors: {
    getLink,
  },
});
