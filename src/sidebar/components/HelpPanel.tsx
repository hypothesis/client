import { Card, Link, Tab } from '@hypothesis/frontend-shared';
import { ExternalIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useCallback, useId, useMemo, useState } from 'preact/hooks';

import { username } from '../helpers/account-id';
import { VersionData } from '../helpers/version-data';
import { withServices } from '../service-context';
import type { SessionService } from '../services/session';
import { useSidebarStore } from '../store';
import SidebarPanel from './SidebarPanel';
import Tutorial from './Tutorial';
import VersionInfo from './VersionInfo';
import TabHeader from './tabs/TabHeader';
import TabPanel from './tabs/TabPanel';

type HelpPanelTabProps = {
  /** What the tab's link should say. */
  linkText: string;
  /** Where the tab's link should go. */
  url: string;
};

/**
 * External link "tabs" at the bottom of the help panel.
 */
function HelpPanelTab({ linkText, url }: HelpPanelTabProps) {
  return (
    <div
      // Set this element's flex-basis and also establish
      // a flex container (centered on both axes)
      className="flex-1 flex items-center justify-center border-r last-of-type:border-r-0 text-md font-medium"
    >
      <Link variant="text-light" href={url} target="_blank" underline="none">
        <div className="flex items-center gap-x-2">
          <span>{linkText}</span> <ExternalIcon className="w-3 h-3" />
        </div>
      </Link>
    </div>
  );
}

type HelpPanelProps = {
  session: SessionService;
};

type PanelKey = 'tutorial' | 'versionInfo';

/**
 * A help sidebar panel with two sub-panels: tutorial and version info.
 */
function HelpPanel({ session }: HelpPanelProps) {
  const store = useSidebarStore();
  const frames = store.frames();
  const mainFrame = store.mainFrame();
  const profile = store.profile();
  const displayName =
    profile.user_info?.display_name ?? username(profile.userid);
  const tutorialTabId = useId();
  const tutorialPanelId = useId();
  const versionTabId = useId();
  const versionPanelId = useId();

  // Should this panel be auto-opened at app launch? Note that the actual
  // auto-open triggering of this panel is owned by the `HypothesisApp` component.
  // This reference is such that we know whether we should "dismiss" the tutorial
  // (permanently for this user) when it is closed.
  const hasAutoDisplayPreference =
    !!store.profile().preferences.show_sidebar_tutorial;

  // The "Tutorial" (getting started) subpanel is the default panel shown
  const [activeSubPanel, setActiveSubPanel] = useState<PanelKey>('tutorial');

  // Build version details about this session/app
  const versionData = useMemo(() => {
    // Sort frames so the main frame is listed first. Other frames will retain
    // their original order, assuming a stable sort.
    const documentFrames = [...frames].sort((a, b) => {
      if (a === mainFrame) {
        return -1;
      } else if (b === mainFrame) {
        return 1;
      } else {
        return 0;
      }
    });

    return new VersionData(
      { userid: profile.userid, displayName },
      documentFrames,
    );
  }, [profile, displayName, frames, mainFrame]);

  // The support ticket URL encodes some version info in it to pre-fill in the
  // create-new-ticket form
  const supportTicketURL = `https://web.hypothes.is/get-help/?sys_info=${versionData.asEncodedURLString()}`;

  const onActiveChanged = useCallback(
    (active: boolean) => {
      if (!active && hasAutoDisplayPreference) {
        // If the tutorial is currently being auto-displayed, update the user
        // preference to disable the auto-display from happening on subsequent
        // app launches
        session.dismissSidebarTutorial();
      }
    },
    [session, hasAutoDisplayPreference],
  );

  return (
    <SidebarPanel
      title="Help"
      panelName="help"
      onActiveChanged={onActiveChanged}
      variant="custom"
    >
      <TabHeader>
        <Tab
          id={tutorialTabId}
          aria-controls={tutorialPanelId}
          variant="tab"
          textContent="Help"
          selected={activeSubPanel === 'tutorial'}
          onClick={() => setActiveSubPanel('tutorial')}
          data-testid="tutorial-tab"
        >
          Help
        </Tab>
        <Tab
          id={versionTabId}
          aria-controls={versionPanelId}
          variant="tab"
          textContent="Version"
          selected={activeSubPanel === 'versionInfo'}
          onClick={() => setActiveSubPanel('versionInfo')}
          data-testid="version-info-tab"
        >
          Version
        </Tab>
      </TabHeader>
      <Card
        classes={classnames({
          'rounded-tl-none': activeSubPanel === 'tutorial',
        })}
      >
        <div className="border-b">
          <TabPanel
            id={tutorialPanelId}
            aria-labelledby={tutorialTabId}
            active={activeSubPanel === 'tutorial'}
            title="Getting started"
          >
            <Tutorial />
          </TabPanel>
          <TabPanel
            id={versionPanelId}
            aria-labelledby={versionTabId}
            active={activeSubPanel === 'versionInfo'}
            title="Version details"
          >
            <VersionInfo versionData={versionData} />
          </TabPanel>
        </div>
        <div className="flex items-center p-3">
          <HelpPanelTab
            linkText="Help topics"
            url="https://web.hypothes.is/help/"
          />
          <HelpPanelTab linkText="New support ticket" url={supportTicketURL} />
        </div>
      </Card>
    </SidebarPanel>
  );
}

export default withServices(HelpPanel, ['session']);
