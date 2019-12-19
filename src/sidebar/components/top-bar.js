const { Fragment, createElement } = require('preact');
const classnames = require('classnames');
const propTypes = require('prop-types');

const bridgeEvents = require('../../shared/bridge-events');
const useStore = require('../store/use-store');
const { applyTheme } = require('../util/theme');
const isThirdPartyService = require('../util/is-third-party-service');
const serviceConfig = require('../service-config');
const { withServices } = require('../util/service-context');
const uiConstants = require('../ui-constants');

const Button = require('./button');
const GroupList = require('./group-list');
const SearchInput = require('./search-input');
const StreamSearchInput = require('./stream-search-input');
const SortMenu = require('./sort-menu');
const UserMenu = require('./user-menu');

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
          <a href="#" onClick={onSignUp} target="_blank" style={loginLinkStyle}>
            Sign up
          </a>{' '}
          /{' '}
          <a href="#" onClick={onLogin} style={loginLinkStyle}>
            Log in
          </a>
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
            isActive={currentActivePanel === uiConstants.PANEL_HELP}
            onClick={requestHelp}
            title="Help"
            useCompactStyle
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
              useCompactStyle
            />
          )}
          <SearchInput query={filterQuery} onSearch={setFilterQuery} />
          <SortMenu />
          {showSharePageButton && (
            <Button
              className="top-bar__icon-button"
              icon="share"
              isActive={
                currentActivePanel === uiConstants.PANEL_SHARE_ANNOTATIONS
              }
              onClick={toggleSharePanel}
              title="Share annotations on this page"
              useCompactStyle
            />
          )}
          <Button
            className="top-bar__icon-button"
            icon="help"
            isActive={currentActivePanel === uiConstants.PANEL_HELP}
            onClick={requestHelp}
            title="Help"
            useCompactStyle
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

module.exports = withServices(TopBar);
