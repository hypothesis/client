'use strict';

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

const GroupList = require('./group-list');
const SearchInput = require('./search-input');
const StreamSearchInput = require('./stream-search-input');
const SortMenu = require('./sort-menu');
const SvgIcon = require('./svg-icon');
const UserMenu = require('./user-menu');

/**
 * Button for opening/closing the help panel
 */
function HelpButton({ onClick }) {
  const isActive = useStore(
    store =>
      store.getState().sidebarPanels.activePanelName === uiConstants.PANEL_HELP
  );
  return (
    <button
      className={classnames('top-bar__btn top-bar__help-btn', {
        'top-bar__btn--active': isActive,
      })}
      onClick={onClick}
      title="Help"
      aria-expanded={isActive}
      aria-pressed={isActive}
    >
      <SvgIcon name="help" className="top-bar__help-icon" />
    </button>
  );
}

HelpButton.propTypes = {
  /* callback */
  onClick: propTypes.func.isRequired,
};

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
  const currentActivePanel = useStore(
    store => store.getState().sidebarPanels.activePanelName
  );

  const applyPendingUpdates = () => streamer.applyPendingUpdates();

  const toggleSharePanel = () => {
    togglePanelFn(uiConstants.PANEL_SHARE_ANNOTATIONS);
  };

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
          <HelpButton onClick={requestHelp} />
          {loginControl}
        </div>
      )}
      {/* Sidebar view */}
      {isSidebar && (
        <div className="top-bar__inner content">
          <GroupList className="GroupList" auth={auth} />
          <div className="top-bar__expander" />
          {pendingUpdateCount > 0 && (
            <a
              className="top-bar__apply-update-btn"
              onClick={applyPendingUpdates}
              title={`Show ${pendingUpdateCount} new/updated ${
                pendingUpdateCount === 1 ? 'annotation' : 'annotations'
              }`}
            >
              <SvgIcon className="top-bar__apply-icon" name="refresh" />
            </a>
          )}
          <SearchInput query={filterQuery} onSearch={setFilterQuery} />
          <SortMenu />
          {showSharePageButton && (
            <button
              className={classnames('top-bar__btn', {
                'top-bar__btn--active':
                  currentActivePanel === uiConstants.PANEL_SHARE_ANNOTATIONS,
              })}
              onClick={toggleSharePanel}
              title="Share annotations on this page"
              aria-label="Share annotations on this page"
            >
              <SvgIcon name="share" />
            </button>
          )}
          <HelpButton onClick={requestHelp} />
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
