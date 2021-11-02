import { Icon } from '@hypothesis/frontend-shared';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';
import VersionData from '../helpers/version-data';

import SidebarPanel from './SidebarPanel';
import Tutorial from './Tutorial';
import VersionInfo from './VersionInfo';

/**
 * @typedef {import('../helpers/version-data').AuthState} AuthState
 */

/**
 * External link "tabs" inside of the help panel.
 *
 * @param {object} props
 *   @param {string} props.linkText - What the tab's link should say
 *   @param {string} props.url - Where the tab's link should go
 */
function HelpPanelTab({ linkText, url }) {
  return (
    <div className="HelpPanel-tabs__tab">
      <a
        href={url}
        className="hyp-u-horizontal-spacing--2 hyp-u-layout-row--center HelpPanel-tabs__link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>{linkText}</span> <Icon name="external" classes="u-icon--small" />
      </a>
    </div>
  );
}

/**
 * @typedef HelpPanelProps
 * @prop {AuthState} auth
 * @prop {import('../services/session').SessionService} session
 */

/**
 * A help sidebar panel with two sub-panels: tutorial and version info.
 *
 * @param {HelpPanelProps} props
 */
function HelpPanel({ auth, session }) {
  const store = useStoreProxy();
  const frames = store.frames();
  const mainFrame = store.mainFrame();

  // Should this panel be auto-opened at app launch? Note that the actual
  // auto-open triggering of this panel is owned by the `HypothesisApp` component.
  // This reference is such that we know whether we should "dismiss" the tutorial
  // (permanently for this user) when it is closed.
  const hasAutoDisplayPreference =
    !!store.profile().preferences.show_sidebar_tutorial;

  // The "Tutorial" (getting started) subpanel is the default panel shown
  const [activeSubPanel, setActiveSubPanel] = useState('tutorial');

  // Build version details about this session/app
  const versionData = useMemo(() => {
    const userInfo = auth || { status: 'logged-out' };

    // Sort frames so the main frame is listed first. Other frames will retain
    // their original order, assuming a stable sort.
    const documentInfo = [...frames].sort((a, b) => {
      if (a === mainFrame) {
        return -1;
      } else if (b === mainFrame) {
        return 1;
      } else {
        return 0;
      }
    });

    return new VersionData(userInfo, documentInfo);
  }, [auth, frames, mainFrame]);

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

  const onActiveChanged = useCallback(
    active => {
      if (!active && hasAutoDisplayPreference) {
        // If the tutorial is currently being auto-displayed, update the user
        // preference to disable the auto-display from happening on subsequent
        // app launches
        session.dismissSidebarTutorial();
      }
    },
    [session, hasAutoDisplayPreference]
  );

  return (
    <SidebarPanel
      title="Help"
      panelName="help"
      onActiveChanged={onActiveChanged}
    >
      <div className="hyp-u-vertical-spacing HelpPanel__content">
        <div className="hyp-u-layout-row--align-center">
          <h3 className="HelpPanel__sub-panel-title">
            {subPanelTitles[activeSubPanel]}
          </h3>
          <div>
            {activeSubPanel === 'versionInfo' && (
              <button
                className="HelpPanel__sub-panel-navigation-button"
                onClick={e => openSubPanel(e, 'tutorial')}
                aria-label="Show tutorial panel"
              >
                Getting started
                <Icon name="arrow-right" />
              </button>
            )}
            {activeSubPanel === 'tutorial' && (
              <button
                className="HelpPanel__sub-panel-navigation-button"
                onClick={e => openSubPanel(e, 'versionInfo')}
                aria-label="Show version information panel"
              >
                About this version
                <Icon name="arrow-right" />
              </button>
            )}
          </div>
        </div>
        <div className="HelpPanel__subcontent">
          {activeSubPanel === 'tutorial' && <Tutorial />}
          {activeSubPanel === 'versionInfo' && (
            <VersionInfo versionData={versionData} />
          )}
        </div>
        <div className="HelpPanel-tabs">
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

export default withServices(HelpPanel, ['session']);
