import { LinkButton, HelpIcon, ShareIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { Service, SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import type { FrameSyncService } from '../services/frame-sync';
import { useSidebarStore } from '../store';
import GroupList from './GroupList';
import SortMenu from './SortMenu';
import TopBarToggleButton from './TopBarToggleButton';
import UserMenu from './UserMenu';
import SearchIconButton from './search/SearchIconButton';
import StreamSearchInput from './search/StreamSearchInput';

export type TopBarProps = {
  /** Flag indicating whether the app is in a sidebar context */
  isSidebar: boolean;

  /** Callback invoked when user clicks "Login" button */
  onLogin: () => void;

  /** Callback invoked when user clicks "Logout" action in account menu */
  onLogout: () => void;

  /** Callback invoked when user clicks "Sign up" button */
  onSignUp: () => void;

  // injected
  frameSync: FrameSyncService;
  settings: SidebarSettings;
};

type ControlName = 'share' | 'account' | 'help';

function controlEnabled(settings: SidebarSettings, name: ControlName) {
  const config: Partial<Service> = serviceConfig(settings) ?? {};
  switch (name) {
    case 'share':
      return (
        !settings.commentsMode && (config.enableShareImportExportPanel ?? true)
      );
    case 'account':
      return config.enableAccountMenu ?? true;
    case 'help':
      return config.enableHelpPanel ?? true;
    default:
      return true;
  }
}

/**
 * The toolbar which appears at the top of the sidebar providing actions
 * to switch groups, view account information, sort/filter annotations etc.
 */
function TopBar({
  isSidebar,
  onLogin,
  onLogout,
  onSignUp,
  frameSync,
  settings,
}: TopBarProps) {
  const loginLinkStyle = applyTheme(['accentColor'], settings);

  const store = useSidebarStore();
  const isLoggedIn = store.isLoggedIn();
  const hasFetchedProfile = store.hasFetchedProfile();

  const toggleSharePanel = () => {
    store.toggleSidebarPanel('shareGroupAnnotations');
  };

  const isHelpPanelOpen = store.isSidebarPanelOpen('help');
  const isAnnotationsPanelOpen = store.isSidebarPanelOpen(
    'shareGroupAnnotations',
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
              {controlEnabled(settings, 'share') && (
                <TopBarToggleButton
                  icon={ShareIcon}
                  expanded={isAnnotationsPanelOpen}
                  pressed={isAnnotationsPanelOpen}
                  onClick={toggleSharePanel}
                  title="Show share panel"
                  data-testid="share-icon-button"
                />
              )}
            </>
          )}
          {controlEnabled(settings, 'help') && (
            <TopBarToggleButton
              icon={HelpIcon}
              expanded={isHelpPanelOpen}
              pressed={isHelpPanelOpen}
              onClick={requestHelp}
              title="Show help panel"
              data-testid="help-icon-button"
            />
          )}
          {isLoggedIn ? (
            controlEnabled(settings, 'account') && (
              <UserMenu onLogout={onLogout} />
            )
          ) : (
            <div
              className="flex items-center text-md font-medium space-x-1 pl-1"
              data-testid="login-links"
            >
              {!isLoggedIn && !hasFetchedProfile && <span>⋯</span>}
              {!isLoggedIn && hasFetchedProfile && (
                <>
                  <LinkButton
                    classes="inline"
                    onClick={onSignUp}
                    style={loginLinkStyle}
                    underline="none"
                  >
                    Sign up
                  </LinkButton>
                  <div>/</div>
                  <LinkButton
                    classes="inline"
                    onClick={onLogin}
                    style={loginLinkStyle}
                    underline="none"
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

export default withServices(TopBar, ['frameSync', 'settings']);
