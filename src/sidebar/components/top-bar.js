import classnames from 'classnames';
import { Fragment, createElement } from 'preact';
import propTypes from 'prop-types';

import bridgeEvents from '../../shared/bridge-events';
import serviceConfig from '../service-config';
import useStore from '../store/use-store';
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
  const useCleanTheme = settings.theme === 'clean';
  const showSharePageButton = !isThirdPartyService(settings);
  const loginLinkStyle = applyTheme(['accentColor'], settings);

  const filterQuery = useStore(store => store.filterQuery());
  const setFilterQuery = useStore(store => store.setFilterQuery);

  const pendingUpdateCount = useStore(store => store.pendingUpdateCount());

  const togglePanelFn = useStore(store => store.toggleSidebarPanel);

  const applyPendingUpdates = () => streamer.applyPendingUpdates();

  const toggleSharePanel = () => {
    togglePanelFn(uiConstants.PANEL_SHARE_ANNOTATIONS);
  };

  const currentActivePanel = useStore(
    store => store.getState().sidebarPanels.activePanelName
  );

  /**
   * Open the help panel, or, if a service callback is configured to handle
   * help requests, fire a relevant event instead
   */
  const requestHelp = () => {
    const service = serviceConfig(settings) || {};
    if (service.onHelpRequestProvided) {
      bridge.call(bridgeEvents.HELP_REQUESTED);
    } else {
      togglePanelFn(uiConstants.PANEL_HELP);
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
    <div
      className={classnames('top-bar', useCleanTheme && 'top-bar--theme-clean')}
    >
      {/* Single-annotation and stream views. */}
      {!isSidebar && (
        <div className="top-bar__inner content">
          <StreamSearchInput />
          <div className="top-bar__expander" />
          <Button
            className="top-bar__icon-button"
            icon="help"
            isExpanded={currentActivePanel === uiConstants.PANEL_HELP}
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
          <div className="top-bar__expander" />
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
          <SearchInput query={filterQuery} onSearch={setFilterQuery} />
          <SortMenu />
          {showSharePageButton && (
            <Button
              className="top-bar__icon-button"
              icon="share"
              isExpanded={
                currentActivePanel === uiConstants.PANEL_SHARE_ANNOTATIONS
              }
              onClick={toggleSharePanel}
              title="Share annotations on this page"
            />
          )}
          <Button
            className="top-bar__icon-button"
            icon="help"
            isExpanded={currentActivePanel === uiConstants.PANEL_HELP}
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
  /**
   * Object containing current authentication status.
   */
  auth: propTypes.shape({
    status: propTypes.string.isRequired,

    // Additional properties when user is logged in.
    displayName: propTypes.string,
    userid: propTypes.string,
    username: propTypes.string,
  }),

  bridge: propTypes.object.isRequired,

  /**
   * Flag indicating whether the app is the sidebar or a top-level page.
   */
  isSidebar: propTypes.bool,

  /**
   * Callback invoked when user clicks "Login" button.
   */
  onLogin: propTypes.func,

  /** Callback invoked when user clicks "Logout" action in account menu. */
  onLogout: propTypes.func,

  /** Callback invoked when user clicks "Sign up" button. */
  onSignUp: propTypes.func,

  // Services
  settings: propTypes.object,
  streamer: propTypes.object,
};

TopBar.injectedProps = ['bridge', 'settings', 'streamer'];

export default withServices(TopBar);
