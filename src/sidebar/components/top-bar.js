import { Fragment, createElement } from 'preact';
import propTypes from 'prop-types';

import bridgeEvents from '../../shared/bridge-events';
import serviceConfig from '../service-config';
import { useStoreProxy } from '../store/use-store';
import uiConstants from '../ui-constants';
import isThirdPartyService from '../util/is-third-party-service';
import { withServices } from '../util/service-context';
import { applyTheme } from '../util/theme';

import Button from './button';
import GroupList from './group-list';
import SearchInput from './search-input';
import SortMenu from './sort-menu';
import StreamSearchInput from './stream-search-input';
import UserMenu from './user-menu';

/**
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * @typedef {import('../components/user-menu').AuthState} AuthState
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
    store.toggleSidebarPanel(uiConstants.PANEL_SHARE_ANNOTATIONS);
  };

  const isHelpPanelOpen = store.isSidebarPanelOpen(uiConstants.PANEL_HELP);
  const isAnnotationsPanelOpen = store.isSidebarPanelOpen(
    uiConstants.PANEL_SHARE_ANNOTATIONS
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
      store.toggleSidebarPanel(uiConstants.PANEL_HELP);
    }
  };

  const loginControl = (
    <Fragment>
      {auth.status === 'unknown' && (
        <span className="top-bar__login-links">⋯</span>
      )}
      {auth.status === 'logged-out' && (
        <span className="top-bar__login-links">
          <Button
            className="top-bar__login-button"
            buttonText="Sign up"
            onClick={onSignUp}
            style={loginLinkStyle}
          />{' '}
          /
          <Button
            className="top-bar__login-button"
            buttonText="Log in"
            onClick={onLogin}
            style={loginLinkStyle}
          />
        </span>
      )}
      {auth.status === 'logged-in' && (
        <UserMenu auth={auth} onLogout={onLogout} />
      )}
    </Fragment>
  );

  return (
    <div className="top-bar">
      {/* Single-annotation and stream views. */}
      {!isSidebar && (
        <div className="top-bar__inner content">
          <StreamSearchInput />
          <div className="u-stretch" />
          <Button
            className="top-bar__icon-button"
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
        <div className="top-bar__inner content">
          <GroupList className="GroupList" auth={auth} />
          <div className="u-stretch" />
          {pendingUpdateCount > 0 && (
            <Button
              className="top-bar__icon-button top-bar__icon-button--refresh"
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
              className="top-bar__icon-button"
              icon="share"
              isExpanded={isAnnotationsPanelOpen}
              onClick={toggleSharePanel}
              title="Share annotations on this page"
            />
          )}
          <Button
            className="top-bar__icon-button"
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

TopBar.propTypes = {
  auth: propTypes.shape({
    status: propTypes.string.isRequired,
    // Additional properties when user is logged in.
    displayName: propTypes.string,
    userid: propTypes.string,
    username: propTypes.string,
  }),
  bridge: propTypes.object.isRequired,
  isSidebar: propTypes.bool,
  onLogin: propTypes.func,
  onLogout: propTypes.func,
  onSignUp: propTypes.func,
  settings: propTypes.object,
  streamer: propTypes.object,
};

TopBar.injectedProps = ['bridge', 'settings', 'streamer'];

export default withServices(TopBar);
