'use strict';

const { Fragment, createElement } = require('preact');
const { useCallback } = require('preact/hooks');
const classnames = require('classnames');
const propTypes = require('prop-types');

const { applyTheme } = require('../util/theme');
const isThirdPartyService = require('../util/is-third-party-service');
const { withServices } = require('../util/service-context');

const GroupList = require('./group-list');
const SearchInput = require('./search-input');
const SortMenu = require('./sort-menu');
const SvgIcon = require('./svg-icon');
const UserMenu = require('./user-menu');

/**
 * The toolbar which appears at the top of the sidebar providing actions
 * to switch groups, view account information, sort/filter annotations etc.
 */
function TopBar({
  auth,
  isSidebar,
  onApplyPendingUpdates,
  onLogin,
  onLogout,
  onSharePage,
  onShowHelpPanel,
  onSignUp,
  pendingUpdateCount,
  searchController,
  settings,
}) {
  const useCleanTheme = settings.theme === 'clean';
  const showSharePageButton = !isThirdPartyService(settings);
  const loginLinkStyle = applyTheme(['accentColor'], settings);

  const onSearch = useCallback(query => searchController.update(query), [
    searchController,
  ]);

  const loginControl = (
    <Fragment>
      {auth.status === 'unknown' && <span className="login-text">⋯</span>}
      {auth.status === 'logged-out' && (
        <span className="login-text">
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
          <SearchInput
            className="SearchInput"
            query={searchController.query()}
            onSearch={onSearch}
            alwaysExpanded={true}
          />
          <div className="top-bar__expander"></div>
          <button
            className="top-bar__btn top-bar__help-btn"
            onClick={onShowHelpPanel}
            title="Help"
            aria-label="Help"
          >
            <SvgIcon name="help" className="top-bar__help-icon" />
          </button>
          {loginControl}
        </div>
      )}
      {/* Sidebar view */}
      {isSidebar && (
        <div className="top-bar__inner content">
          <GroupList className="GroupList" auth={auth} />
          <div className="top-bar__expander"></div>
          {pendingUpdateCount > 0 && (
            <a
              className="top-bar__apply-update-btn"
              onClick={onApplyPendingUpdates}
              title={`Show ${pendingUpdateCount} new/updated annotation(s)`}
            >
              <SvgIcon className="top-bar__apply-icon" name="refresh" />
            </a>
          )}
          <SearchInput
            className="SearchInput"
            query={searchController.query()}
            onSearch={onSearch}
            title="Filter the annotation list"
          />
          <SortMenu />
          {showSharePageButton && (
            <button
              className="top-bar__btn"
              onClick={onSharePage}
              title="Share this page"
              aria-label="Share this page"
            >
              <i className="h-icon-annotation-share"></i>
            </button>
          )}
          <button
            className="top-bar__btn top-bar__help-btn"
            onClick={onShowHelpPanel}
            title="Help"
            aria-label="Help"
          >
            <SvgIcon name="help" className="top-bar__help-icon" />
          </button>
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
  auth: propTypes.object,

  /**
   * Flag indicating whether the app is the sidebar or a top-level page.
   */
  isSidebar: propTypes.bool,

  /**
   * Callback invoked when user clicks "Help" button.
   */
  onShowHelpPanel: propTypes.func,

  /**
   * Callback invoked when user clicks "Login" button.
   */
  onLogin: propTypes.func,

  /** Callback invoked when user clicks "Logout" action in account menu. */
  onLogout: propTypes.func,

  /** Callback invoked when user clicks "Share" toolbar action. */
  onSharePage: propTypes.func,

  /** Callback invoked when user clicks "Sign up" button. */
  onSignUp: propTypes.func,

  searchController: propTypes.object,

  /** Count of updates received via WebSocket that have not been applied. */
  pendingUpdateCount: propTypes.number,

  /** Called when user clicks button to apply pending real-time updates. */
  onApplyPendingUpdates: propTypes.func,

  // Services
  settings: propTypes.object,
};

TopBar.injectedProps = ['settings'];

module.exports = withServices(TopBar);
