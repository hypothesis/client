import { SvgIcon } from '@hypothesis/frontend-shared';
import { createElement } from 'preact';
import { useCallback, useMemo, useState } from 'preact/hooks';
import propTypes from 'prop-types';

import { useStoreProxy } from '../store/use-store';
import uiConstants from '../ui-constants';
import { withServices } from '../service-context';
import VersionData from '../helpers/version-data';

import SidebarPanel from './sidebar-panel';
import Tutorial from './tutorial';
import VersionInfo from './version-info';

/**
 * @typedef {import('../components/user-menu').AuthState} AuthState
 */

/**
 * External link "tabs" inside of the help panel.
 *
 * @param {Object} props
 *   @param {string} props.linkText - What the tab's link should say
 *   @param {string} props.url - Where the tab's link should go
 */
function HelpPanelTab({ linkText, url }) {
  return (
    <div className="help-panel-tabs__tab">
      <a
        href={url}
        className="help-panel-tabs__link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {linkText}{' '}
        <SvgIcon
          name="external"
          className="help-panel-tabs__icon"
          inline={true}
        />
      </a>
    </div>
  );
}

HelpPanelTab.propTypes = {
  linkText: propTypes.string.isRequired,
  url: propTypes.string.isRequired,
};

/**
 * @typedef HelpPanelProps
 * @prop {AuthState} auth - Object with auth and user information
 * @prop {Object} session - Injected service
 */

/**
 * A help sidebar panel with two sub-panels: tutorial and version info.
 *
 * @param {HelpPanelProps} props
 */
function HelpPanel({ auth, session }) {
  const store = useStoreProxy();
  const mainFrame = store.mainFrame();

  // Should this panel be auto-opened at app launch? Note that the actual
  // auto-open triggering of this panel is owned by the `hypothesis-app` component.
  // This reference is such that we know whether we should "dismiss" the tutorial
  // (permanently for this user) when it is closed.
  const hasAutoDisplayPreference = !!store.profile().preferences
    .show_sidebar_tutorial;

  // The "Tutorial" (getting started) subpanel is the default panel shown
  const [activeSubPanel, setActiveSubPanel] = useState('tutorial');

  // Build version details about this session/app
  const versionData = useMemo(() => {
    const userInfo = auth || { status: 'logged-out' };
    const documentInfo = mainFrame || {};
    return new VersionData(userInfo, documentInfo);
  }, [auth, mainFrame]);

  // The support ticket URL encodes some version info in it to pre-fill in the
  // create-new-ticket form
  const supportTicketURL = `https://web.hypothes.is/get-help/?sys_info=${versionData.asEncodedURLString()}`;

  const subPanelTitles = {
    tutorial: 'Getting started',
    versionInfo: 'About this version',
  };

  const openSubPanel = (e, panelName) => {
    e.preventDefault();
    setActiveSubPanel(panelName);
  };

  const dismissFn = session.dismissSidebarTutorial; // Reference for useCallback dependency
  const onActiveChanged = useCallback(
    active => {
      if (!active && hasAutoDisplayPreference) {
        // If the tutorial is currently being auto-displayed, update the user
        // preference to disable the auto-display from happening on subsequent
        // app launches
        dismissFn();
      }
    },
    [dismissFn, hasAutoDisplayPreference]
  );

  return (
    <SidebarPanel
      title="Help"
      panelName={uiConstants.PANEL_HELP}
      onActiveChanged={onActiveChanged}
    >
      <div className="help-panel__content u-vertical-rhythm">
        <div className="u-layout-row--align-middle">
          <h3 className="help-panel__sub-panel-title">
            {subPanelTitles[activeSubPanel]}
          </h3>
          <div>
            {activeSubPanel === 'versionInfo' && (
              <button
                className="help-panel__sub-panel-navigation-button"
                onClick={e => openSubPanel(e, 'tutorial')}
                aria-label="Show tutorial panel"
              >
                Getting started
                <SvgIcon
                  name="arrow-right"
                  className="help-panel__sub-panel-link-icon"
                />
              </button>
            )}
            {activeSubPanel === 'tutorial' && (
              <button
                className="help-panel__sub-panel-navigation-button"
                onClick={e => openSubPanel(e, 'versionInfo')}
                aria-label="Show version information panel"
              >
                About this version
                <SvgIcon name="arrow-right" />
              </button>
            )}
          </div>
        </div>
        <div className="help-panel__subcontent">
          {activeSubPanel === 'tutorial' && <Tutorial />}
          {activeSubPanel === 'versionInfo' && (
            <VersionInfo versionData={versionData} />
          )}
        </div>
        <div className="help-panel-tabs">
          <HelpPanelTab
            linkText="Help topics"
            url="https://web.hypothes.is/help/"
          />
          <HelpPanelTab linkText="New support ticket" url={supportTicketURL} />
        </div>
      </div>
    </SidebarPanel>
  );
}

HelpPanel.propTypes = {
  auth: propTypes.object.isRequired,
  session: propTypes.object.isRequired,
};

HelpPanel.injectedProps = ['session'];
export default withServices(HelpPanel);
