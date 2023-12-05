import { withServices } from '../../service-context';
import type { RouterService } from '../../services/router';
import { useSidebarStore } from '../../store';
import SearchInput from '../old-search/SearchInput';
import SearchField from './SearchField';

export type StreamSearchInputProps = {
  router: RouterService;
};

/**
 * Search input for the single annotation view and stream.
 *
 * This displays and updates the "q" query param in the URL.
 */
function StreamSearchInput({ router }: StreamSearchInputProps) {
  const store = useSidebarStore();
  const searchPanelEnabled = store.isFeatureEnabled('search_panel');
  const { q } = store.routeParams();
  const setQuery = (query: string) => {
    // Re-route the user to `/stream` if they are on `/a/:id` and then set
    // the search query.
    router.navigate('stream', { q: query });
  };

  return searchPanelEnabled ? (
    <SearchField query={q ?? ''} onSearch={setQuery} />
  ) : (
    <SearchInput query={q ?? ''} onSearch={setQuery} alwaysExpanded />
  );
}

export default withServices(StreamSearchInput, ['router']);
