import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../util/service-context';

import SearchInput from './search-input';

/**
 * @typedef StreamSearchInputProps
 * @prop {Object} router - Injected service
 */

/**
 * Search input for the single annotation view and stream.
 *
 * This displays and updates the "q" query param in the URL.
 *
 * @param {StreamSearchInputProps} props
 */
function StreamSearchInput({ router }) {
  const store = useStoreProxy();
  const query = store.routeParams().q;
  const setQuery = query => {
    // Re-route the user to `/stream` if they are on `/a/:id` and then set
    // the search query.
    router.navigate('stream', { q: query });
  };

  return (
    <SearchInput query={query} onSearch={setQuery} alwaysExpanded={true} />
  );
}

StreamSearchInput.propTypes = {
  router: propTypes.object,
};

StreamSearchInput.injectedProps = ['router'];

export default withServices(StreamSearchInput);
