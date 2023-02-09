import { Link, LinkButton } from '@hypothesis/frontend-shared/lib/next';
import {
  ArrowRightIcon,
  ExternalIcon,
} from '@hypothesis/frontend-shared/lib/next';
import type { ComponentChildren as Children } from 'preact';
import { useCallback, useMemo, useState } from 'preact/hooks';

import { username } from '../helpers/account-id';
import { VersionData } from '../helpers/version-data';
import { withServices } from '../service-context';
import type { SessionService } from '../services/session';
import { useSidebarStore } from '../store';
import SidebarPanel from './SidebarPanel';
import Tutorial from './Tutorial';
import VersionInfo from './VersionInfo';

type HelpPanelNavigationButtonProps = {
  children: Children;
  onClick: (e: Event) => void;
};

/**
 * Navigation link-button to swap between sub-panels in the help panel
 */
function HelpPanelNavigationButton({
  children,
  onClick,
}: HelpPanelNavigationButtonProps) {
  return (
    <LinkButton color="brand" onClick={onClick} underline="hover">
      <div className="flex items-center gap-x-1">
        {children}
        <ArrowRightIcon className="w-em h-em" />
      </div>
    </LinkButton>
  );
}

type HelpPanelTabProps = {
  /** What the tab's link should say. */
  linkText: string;
  /** Where the tab's link should go. */
  url: string;
};

/**
 * External link "tabs" inside of the help panel.
 */
function HelpPanelTab({ linkText, url }: HelpPanelTabProps) {
  return (
    <div
      // Set this element's flex-basis and also establish
      // a flex container (centered on both axes)
      className="flex-1 flex items-center justify-center border-r last-of-type:border-r-0 text-md font-medium"
    >
      <Link color="text-light" href={url} target="_blank">
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
  type PanelKey = keyof typeof subPanelTitles;

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
      documentFrames
    );
  }, [profile, displayName, frames, mainFrame]);

  // The support ticket URL encodes some version info in it to pre-fill in the
  // create-new-ticket form
  const supportTicketURL = `https://web.hypothes.is/get-help/?sys_info=${versionData.asEncodedURLString()}`;

  const openSubPanel = (e: Event, panelName: PanelKey) => {
    e.preventDefault();
    setActiveSubPanel(panelName);
  };

  const onActiveChanged = useCallback(
    (active: boolean) => {
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
          <h3 className="grow text-md font-medium" data-testid="subpanel-title">
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
