import bridgeEvents from '../../shared/bridge-events';
import serviceConfig from '../config/service-config';
import { useStoreProxy } from '../store/use-store';
import isThirdPartyService from '../helpers/is-third-party-service';
import { withServices } from '../service-context';
import { applyTheme } from '../helpers/theme';

import Button from './Button';
import GroupList from './GroupList';
import SearchInput from './SearchInput';
import SortMenu from './SortMenu';
import StreamSearchInput from './StreamSearchInput';
import UserMenu from './UserMenu';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * @typedef {import('../components/UserMenu').AuthState} AuthState
 * @typedef {import('../../shared/bridge').default} Bridge
 */

/**
 * @typedef TopBarProps
 * @prop {AuthState} [auth]
 * @prop {Bridge} bridge
 * @prop {boolean} [isSidebar] - Flag indicating whether the app is the sidebar or a top-level page.
 * @prop {() => any} [onLogin] - Callback invoked when user clicks "Login" button.
 * @prop {() => any} [onLogout] - Callback invoked when user clicks "Logout" action in account menu.
 * @prop {() => any} [onSignUp] - Callback invoked when user clicks "Sign up" button.
 * @prop {MergedConfig} [settings]
 * @prop {Object} [streamer]
 */

/**
 * The toolbar which appears at the top of the sidebar providing actions
 * to switch groups, view account information, sort/filter annotations etc.
 */
function TopBar({
  auth,
  bridge,
  isSidebar,
  onLogin,
  onLogout,
  onSignUp,
  settings,
  streamer,
}) {
  const showSharePageButton = !isThirdPartyService(settings);
  const loginLinkStyle = applyTheme(['accentColor'], settings);

  const store = useStoreProxy();
  const filterQuery = store.filterQuery();
  const pendingUpdateCount = store.pendingUpdateCount();

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
      bridge.call(bridgeEvents.HELP_REQUESTED);
    } else {
      store.toggleSidebarPanel('help');
    }
  };

  const loginControl = (
    <>
      {auth.status === 'unknown' && (
        <span className="TopBar__login-links">⋯</span>
      )}
      {auth.status === 'logged-out' && (
        <span className="TopBar__login-links">
          <Button
            className="TopBar__login-button"
            buttonText="Sign up"
            onClick={onSignUp}
            style={loginLinkStyle}
          />{' '}
          /
          <Button
            className="TopBar__login-button"
            buttonText="Log in"
            onClick={onLogin}
            style={loginLinkStyle}
          />
        </span>
      )}
      {auth.status === 'logged-in' && (
        <UserMenu auth={auth} onLogout={onLogout} />
      )}
    </>
  );

  return (
    <div className="TopBar">
      {/* Single-annotation and stream views. */}
      {!isSidebar && (
        <div className="TopBar__inner content">
          <StreamSearchInput />
          <div className="u-stretch" />
          <Button
            className="TopBar__icon-button"
            icon="help"
            isExpanded={isHelpPanelOpen}
            onClick={requestHelp}
            title="Help"
          />
          {loginControl}
        </div>
      )}
      {/* Sidebar view */}
      {isSidebar && (
        <div className="TopBar__inner content">
          <GroupList className="GroupList" auth={auth} />
          <div className="u-stretch" />
          {pendingUpdateCount > 0 && (
            <Button
              className="TopBar__icon-button TopBar__icon-button--refresh"
              icon="refresh"
              onClick={applyPendingUpdates}
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
            <Button
              className="TopBar__icon-button"
              icon="share"
              isExpanded={isAnnotationsPanelOpen}
              onClick={toggleSharePanel}
              title="Share annotations on this page"
            />
          )}
          <Button
            className="TopBar__icon-button"
            icon="help"
            isExpanded={isHelpPanelOpen}
            onClick={requestHelp}
            title="Help"
          />
          {loginControl}
        </div>
      )}
    </div>
  );
}

TopBar.injectedProps = ['bridge', 'settings', 'streamer'];

export default withServices(TopBar);
