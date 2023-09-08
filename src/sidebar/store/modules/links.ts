import { replaceURLParams } from '../../util/url';
import { createStoreModule, makeAction } from '../create-store';

export type State = Record<string, string> | null;

const initialState: State = null;

const reducers = {
  UPDATE_LINKS(state: State, action: { links: Record<string, string> }) {
    return {
      ...action.links,
    };
  },
};

/**
 * Update the link map
 *
 * @param links - Link map fetched from the `/api/links` endpoint
 */
function updateLinks(links: Record<string, string>) {
  return makeAction(reducers, 'UPDATE_LINKS', { links });
}

/**
 * Render a service link (URL) using the given `params`
 *
 * Returns an empty string if links have not been fetched yet.
 */
function getLink(
  state: State,
  linkName: string,
  params: Record<string, string> = {},
) {
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

export const linksModule = createStoreModule(initialState as State, {
  namespace: 'links',
  reducers,
  actionCreators: {
    updateLinks,
  },
  selectors: {
    getLink,
  },
});
