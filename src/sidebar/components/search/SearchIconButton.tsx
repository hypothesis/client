import { SearchIcon, Spinner } from '@hypothesis/frontend-shared';
import { useCallback, useRef } from 'preact/hooks';

import { useShortcut } from '../../../shared/shortcut';
import { isMacOS } from '../../../shared/user-agent';
import type { SidebarStore } from '../../store';
import { useSidebarStore } from '../../store';
import TopBarToggleButton from '../TopBarToggleButton';

/**
 * Respond to keydown events on the document (shortcut keys):
 *
 * - Open the search panel when the user presses '/', unless the user is
 *   currently typing in or focused on an input field.
 * - Open the search panel when the user presses CMD-K (MacOS) or CTRL-K
 *   (everyone else)
 */
function useSearchKeyboardShortcuts(store: SidebarStore) {
  const prevFocusRef = useRef<HTMLOrSVGElement | null>(null);

  const openSearch = useCallback(
    (event: KeyboardEvent) => {
      // When user is in an input field, respond to CMD-/CTRL-K keypresses,
      // but ignore '/' keypresses
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        event.target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
      ) {
        return;
      }
      prevFocusRef.current = document.activeElement as HTMLOrSVGElement | null;
      if (!store.isSidebarPanelOpen('searchAnnotations')) {
        store.openSidebarPanel('searchAnnotations');
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [store],
  );

  const modifierKey = isMacOS() ? 'meta' : 'ctrl';

  useShortcut('/', openSearch);
  useShortcut(`${modifierKey}+k`, openSearch);
}

export default function SearchIconButton() {
  const store = useSidebarStore();
  const isLoading = store.isLoading();
  const isSearchPanelOpen = store.isSidebarPanelOpen('searchAnnotations');

  const toggleSearchPanel = useCallback(() => {
    store.toggleSidebarPanel('searchAnnotations');
  }, [store]);

  useSearchKeyboardShortcuts(store);

  return (
    <>
      {isLoading && <Spinner />}
      {!isLoading && (
        <TopBarToggleButton
          icon={SearchIcon}
          expanded={isSearchPanelOpen}
          pressed={isSearchPanelOpen}
          onClick={toggleSearchPanel}
          title="Search annotations"
        />
      )}
    </>
  );
}
