import {
  IconButton,
  LinkButton,
  HelpIcon,
  RefreshIcon,
  ShareIcon,
} from '@hypothesis/frontend-shared/lib/next';
import classnames from 'classnames';

import { serviceConfig } from '../config/service-config';
import { isThirdPartyService } from '../helpers/is-third-party-service';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';

import GroupList from './GroupList';
import SearchInput from './SearchInput';
import SortMenu from './SortMenu';
import StreamSearchInput from './StreamSearchInput';
import UserMenu from './UserMenu';

/**
 * @typedef {import('preact').ComponentChildren} Children
 * @typedef {import('../services/frame-sync').FrameSyncService} FrameSyncService
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 * @typedef {import('../services/streamer').StreamerService} StreamerService
 */

/**
 * @typedef TopBarProps
 * @prop {FrameSyncService} frameSync - injected
 * @prop {boolean} isSidebar - Flag indicating whether the app is the sidebar or a top-level page.
 * @prop {() => void} onLogin - Callback invoked when user clicks "Login" button.
 * @prop {() => void} onLogout - Callback invoked when user clicks "Logout" action in account menu.
 * @prop {() => void} onSignUp - Callback invoked when user clicks "Sign up" button.
 * @prop {SidebarSettings} settings - injected
 * @prop {StreamerService} streamer - injected
 */

/**
 * The toolbar which appears at the top of the sidebar providing actions
 * to switch groups, view account information, sort/filter annotations etc.
 *
 * @param {TopBarProps} props
 */
function TopBar({
  frameSync,
  isSidebar,
  onLogin,
  onLogout,
  onSignUp,
  settings,
  streamer,
}) {
  const showSharePageButton = !isThirdPartyService(settings);
  const loginLinkStyle = applyTheme(['accentColor'], settings);

  const store = useSidebarStore();
  const filterQuery = store.filterQuery();
  const pendingUpdateCount = store.pendingUpdateCount();
  const isLoggedIn = store.isLoggedIn();
  const hasFetchedProfile = store.hasFetchedProfile();

  const applyPendingUpdates = () => streamer.applyPendingUpdates();

  const toggleSharePanel = () => {
    store.toggleSidebarPanel('shareGroupAnnotations');
  };

  const isHelpPanelOpen = store.isSidebarPanelOpen('help');
  const isAnnotationsPanelOpen = store.isSidebarPanelOpen(
    'shareGroupAnnotations'
  );

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
        'text-grey-7 border-b theme-clean:border-b-0 bg-white'
      )}
      data-testid="top-bar"
    >
      <div
        className={classnames(
          'container flex items-center h-full',
          // Text sizing will size icons in buttons correctly
          'text-[16px]'
        )}
        data-testid="top-bar-content"
      >
        {isSidebar ? <GroupList /> : <StreamSearchInput />}
        <div className="grow flex items-center justify-end">
          {isSidebar && (
            <>
              {pendingUpdateCount > 0 && (
                <IconButton
                  icon={RefreshIcon}
                  onClick={applyPendingUpdates}
                  size="xs"
                  variant="primary"
                  title={`Show ${pendingUpdateCount} new/updated ${
                    pendingUpdateCount === 1 ? 'annotation' : 'annotations'
                  }`}
                />
              )}
              <SearchInput
                query={filterQuery || null}
                onSearch={store.setFilterQuery}
              />
              <SortMenu />
              {showSharePageButton && (
                <IconButton
                  icon={ShareIcon}
                  expanded={isAnnotationsPanelOpen}
                  onClick={toggleSharePanel}
                  size="xs"
                  title="Share annotations on this page"
                />
              )}
            </>
          )}
          <IconButton
            icon={HelpIcon}
            expanded={isHelpPanelOpen}
            onClick={requestHelp}
            size="xs"
            title="Help"
          />
          {isLoggedIn ? (
            <UserMenu onLogout={onLogout} />
          ) : (
            <div
              className="flex items-center text-lg font-medium space-x-1"
              data-testid="login-links"
            >
              {!isLoggedIn && !hasFetchedProfile && <span>⋯</span>}
              {!isLoggedIn && hasFetchedProfile && (
                <>
                  <LinkButton
                    classes="inline"
                    onClick={onSignUp}
                    style={loginLinkStyle}
                  >
                    Sign up
                  </LinkButton>
                  <div>/</div>
                  <LinkButton
                    classes="inline"
                    onClick={onLogin}
                    style={loginLinkStyle}
                  >
                    Log in
                  </LinkButton>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withServices(TopBar, ['frameSync', 'settings', 'streamer']);
