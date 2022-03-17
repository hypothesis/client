import { Icon, Link, LinkButton } from '@hypothesis/frontend-shared';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { useStoreProxy } from '../store/use-store';
import { withServices } from '../service-context';
import { VersionData } from '../helpers/version-data';

import SidebarPanel from './SidebarPanel';
import Tutorial from './Tutorial';
import VersionInfo from './VersionInfo';

/**
 * @typedef {import('../helpers/version-data').AuthState} AuthState
 * @typedef {import("preact").ComponentChildren} Children
 */

/**
 * Navigation link-button to swap between sub-panels in the help panel
 *
 * @param {object} props
 *   @param {Children} props.children
 *   @param {() => void} props.onClick
 */
function HelpPanelNavigationButton({ children, onClick }) {
  return (
    <LinkButton classes="leading-none text-brand" onClick={onClick}>
      {children}
      <Icon classes="ml-1" name="arrow-right" />
    </LinkButton>
  );
}

/**
 * External link "tabs" inside of the help panel.
 *
 * @param {object} props
 *   @param {string} props.linkText - What the tab's link should say
 *   @param {string} props.url - Where the tab's link should go
 */
function HelpPanelTab({ linkText, url }) {
  return (
    <div className="flex-1 border-r last-of-type:border-r-0">
      <Link
        href={url}
        classes="flex items-center justify-center space-x-2 text-color-text-light text-lg font-medium"
        target="_blank"
      >
        <span>{linkText}</span> <Icon name="external" classes="w-3 h-3" />
      </Link>
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

  const subPanelTitles = {
    tutorial: 'Getting started',
    versionInfo: 'About this version',
  };

  // The "Tutorial" (getting started) subpanel is the default panel shown
  const [activeSubPanel, setActiveSubPanel] = useState(
    /** @type {keyof subPanelTitles} */ ('tutorial')
  );

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

  /**
   * @param {Event} e
   * @param {keyof subPanelTitles} panelName
   */
  const openSubPanel = (e, panelName) => {
    e.preventDefault();
    setActiveSubPanel(panelName);
  };

  const onActiveChanged = useCallback(
    /** @param {boolean} active */
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
      <div className="space-y-4">
        <div className="flex items-center">
          <h3 className="grow text-lg font-medium" data-testid="subpanel-title">
            {subPanelTitles[activeSubPanel]}
          </h3>
          {activeSubPanel === 'versionInfo' && (
            <HelpPanelNavigationButton
              onClick={e => openSubPanel(e, 'tutorial')}
            >
              Getting started
            </HelpPanelNavigationButton>
          )}
          {activeSubPanel === 'tutorial' && (
            <HelpPanelNavigationButton
              onClick={e => openSubPanel(e, 'versionInfo')}
            >
              About this version
            </HelpPanelNavigationButton>
          )}
        </div>
        <div className="border-y py-4">
          {activeSubPanel === 'tutorial' && <Tutorial />}
          {activeSubPanel === 'versionInfo' && (
            <VersionInfo versionData={versionData} />
          )}
        </div>
        <div className="flex items-center">
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
