import {
  HelpIcon,
  ShareIcon,
  LinkButton,
  Spinner,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import type { FrameSyncService } from '../services/frame-sync';
import { useSidebarStore } from '../store';
import GroupList from './GroupList';
import NostrUserMenu from './NostrUserMenu';
import SortMenu from './SortMenu';
import TopBarToggleButton from './TopBarToggleButton';
import SearchIconButton from './search/SearchIconButton';
import StreamSearchInput from './search/StreamSearchInput';

export type TopBarProps = {
  /** Flag indicating whether the app is in a sidebar context */
  isSidebar: boolean;

  /** Callback invoked when user clicks "Logout" action in Nostr account menu */
  onNostrLogout: () => void;

  // injected
  frameSync: FrameSyncService;
  settings: SidebarSettings;
};

/**
 * The toolbar which appears at the top of the sidebar providing actions
 * to switch groups, view account information, sort/filter annotations etc.
 */
function TopBar({
  isSidebar,
  onNostrLogout,
  frameSync,
  settings,
}: TopBarProps) {
  const store = useSidebarStore();
  const nostrProfile = store.getProfile();
  const isNostrProfileLoading = store.isProfileLoading();

  const toggleSharePanel = () => {
    store.toggleSidebarPanel('shareGroupAnnotations');
  };

  const isHelpPanelOpen = store.isSidebarPanelOpen('help');
  const isAnnotationsPanelOpen = store.isSidebarPanelOpen(
    'shareGroupAnnotations',
  );

  const toggleNostrConnectPanel = () => {
    store.toggleSidebarPanel('nostrConnect');
  };
  const isNostrConnectPanelOpen = store.isSidebarPanelOpen('nostrConnect');

  /**
   * Open the help panel, or, if a service callback is configured to handle
   * help requests, fire a relevant event instead
   */
  const requestHelp = () => {
    const service = serviceConfig(settings);
    if (service && service.onHelpRequestProvided) {
      frameSync.notifyHost('helpRequested');
    } else {
      store.toggleSidebarPanel('help');
    }
  };

  return (
    <div
      className={classnames(
        'absolute h-10 left-0 top-0 right-0 z-4',
        'text-grey-7 border-b theme-clean:border-b-0 bg-white',
      )}
      data-testid="top-bar"
    >
      <div
        className={classnames(
          'container flex items-center h-full',
          // Text sizing will size icons in buttons correctly
          'text-[16px]',
        )}
        data-testid="top-bar-content"
      >
        {isSidebar ? <GroupList /> : <StreamSearchInput />}
        <div className="grow flex items-center justify-end">
          {isSidebar && (
            <>
              <SearchIconButton />
              <SortMenu />
              <TopBarToggleButton
                icon={ShareIcon}
                expanded={isAnnotationsPanelOpen}
                pressed={isAnnotationsPanelOpen}
                onClick={toggleSharePanel}
                title="Share annotations on this page"
                data-testid="share-icon-button"
              />
            </>
          )}
          <TopBarToggleButton
            icon={HelpIcon}
            expanded={isHelpPanelOpen}
            pressed={isHelpPanelOpen}
            onClick={requestHelp}
            title="Help"
            data-testid="help-icon-button"
          />
          {!nostrProfile ? (
            <LinkButton
              onClick={toggleNostrConnectPanel}
              expanded={isNostrConnectPanelOpen}
              data-testid="nostr-connect-button"
              style={applyTheme(['accentColor'], settings)}
            >
              Log in with Nostr
            </LinkButton>
          ) : isNostrProfileLoading ? (
            <div className="flex items-center px-3">
              <Spinner />
            </div>
          ) : (
            <NostrUserMenu onNostrLogout={onNostrLogout} />
          )}
        </div>
      </div>
    </div>
  );
}

export default withServices(TopBar, ['frameSync', 'settings']);
