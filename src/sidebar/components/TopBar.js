import { IconButton, LinkButton } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import { isThirdPartyService } from '../helpers/is-third-party-service';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import { useStoreProxy } from '../store/use-store';

import GroupList from './GroupList';
import SearchInput from './SearchInput';
import SidebarContent from './SidebarContent';
import SortMenu from './SortMenu';
import StreamSearchInput from './StreamSearchInput';
import UserMenu from './UserMenu';

/**
 * @typedef {import('../components/UserMenu').AuthState} AuthState
 * @typedef {import('preact').ComponentChildren} Children
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * @typedef TopBarProps
 * @prop {AuthState} auth
 * @prop {boolean} isSidebar - Flag indicating whether the app is the sidebar or a top-level page.
 * @prop {() => void} onApplyUpdates
 * @prop {() => void} onLogin - Callback invoked when user clicks "Login" button.
 * @prop {() => void} onLogout - Callback invoked when user clicks "Logout" action in account menu.
 * @prop {() => void} onRequestHelp - Callback invoked when user clicks "Help" button.
 * @prop {() => void} onSignUp - Callback invoked when user clicks "Sign up" button.
 * @prop {number} pendingUpdateCount
 * @prop {SidebarSettings} settings - injected
 */

/**
 * The toolbar which appears at the top of the sidebar providing actions
 * to switch groups, view account information, sort/filter annotations etc.
 *
 * @param {TopBarProps} props
 */
function TopBar({
  auth,
  isSidebar,
  onApplyUpdates,
  onLogin,
  onLogout,
  onRequestHelp,
  onSignUp,
  pendingUpdateCount,
  settings,
}) {
  const showSharePageButton = !isThirdPartyService(settings);
  const loginLinkStyle = applyTheme(['accentColor'], settings);

  const store = useStoreProxy();
  const filterQuery = store.filterQuery();

  const toggleSharePanel = () => {
    store.toggleSidebarPanel('shareGroupAnnotations');
  };

  const isHelpPanelOpen = store.isSidebarPanelOpen('help');
  const isAnnotationsPanelOpen = store.isSidebarPanelOpen(
    'shareGroupAnnotations'
  );

  return (
    <div
      className={classnames(
        // This absolute-positioned top bar allows content to scroll beneath it;
        // the use of `transform-gpu` can kick on hardware acceleration to make
        // this smoother
        'absolute h-10 left-0 top-0 right-0 z-4 transform-gpu',
        'text-grey-7 border-b theme-clean:border-b-0 bg-white'
      )}
      data-testid="top-bar"
    >
      <SidebarContent
        classes={classnames(
          'flex items-center h-full',
          // This precise horizontal padding makes the edges of its contents
          // align accurately with the edges of annotation cards in the sidebar
          'px-[9px]',
          // Text sizing will size icons in buttons correctly
          'text-xl'
        )}
        data-testid="top-bar-content"
      >
        {isSidebar ? <GroupList /> : <StreamSearchInput />}
        <div className="grow flex items-center justify-end">
          {isSidebar && (
            <>
              {pendingUpdateCount > 0 && (
                <IconButton
                  icon="refresh"
                  onClick={onApplyUpdates}
                  size="small"
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
                  icon="share"
                  expanded={isAnnotationsPanelOpen}
                  onClick={toggleSharePanel}
                  size="small"
                  title="Share annotations on this page"
                />
              )}
            </>
          )}
          <IconButton
            icon="help"
            expanded={isHelpPanelOpen}
            onClick={onRequestHelp}
            size="small"
            title="Help"
          />
          {auth.status === 'logged-in' ? (
            <UserMenu auth={auth} onLogout={onLogout} />
          ) : (
            <div
              className="flex items-center text-lg font-medium space-x-1"
              data-testid="login-links"
            >
              {auth.status === 'unknown' && <span>⋯</span>}
              {auth.status === 'logged-out' && (
                <>
                  <LinkButton
                    classes="inline"
                    onClick={onSignUp}
                    style={loginLinkStyle}
                    variant="primary"
                  >
                    Sign up
                  </LinkButton>
                  <div>/</div>
                  <LinkButton
                    classes="inline"
                    onClick={onLogin}
                    style={loginLinkStyle}
                    variant="primary"
                  >
                    Log in
                  </LinkButton>
                </>
              )}
            </div>
          )}
        </div>
      </SidebarContent>
    </div>
  );
}

export default withServices(TopBar, ['settings']);
