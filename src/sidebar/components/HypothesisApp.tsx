import { confirm } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useMemo } from 'preact/hooks';

import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import { isThirdPartyService } from '../helpers/is-third-party-service';
import { shouldAutoDisplayTutorial } from '../helpers/session';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import type { AuthService } from '../services/auth';
import type { FrameSyncService } from '../services/frame-sync';
import type { NostrSettingsService } from '../services/nostr-settings';
import type { SessionService } from '../services/session';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import AnnotationView from './AnnotationView';
import HelpPanel from './HelpPanel';
import NostrConnectPanel from './NostrConnectPanel';
import NotebookView from './NotebookView';
import ProfileView from './ProfileView';
import ShareDialog from './ShareDialog';
import SidebarView from './SidebarView';
import StreamView from './StreamView';
import ToastMessages from './ToastMessages';
import TopBar from './TopBar';
import SearchPanel from './search/SearchPanel';

export type HypothesisAppProps = {
  auth: AuthService;
  frameSync: FrameSyncService;
  settings: SidebarSettings;
  session: SessionService;
  toastMessenger: ToastMessengerService;
  nostrSettings: NostrSettingsService;
};

/**
 * The root component for the Hypothesis client.
 *
 * This handles login/logout actions and renders the top navigation bar
 * and content appropriate for the current route.
 */
function HypothesisApp({
  auth,
  frameSync,
  settings,
  session,
  toastMessenger,
  nostrSettings,
}: HypothesisAppProps) {
  const store = useSidebarStore();
  const profile = store.profile();
  const route = store.route();
  const isModalRoute = route === 'notebook' || route === 'profile';

  const backgroundStyle = useMemo(
    () => applyTheme(['appBackgroundColor'], settings),
    [settings],
  );
  const isThemeClean = settings.theme === 'clean';

  const isSidebar = route === 'sidebar';

  useEffect(() => {
    if (shouldAutoDisplayTutorial(isSidebar, profile, settings)) {
      store.openSidebarPanel('help');
    }
  }, [isSidebar, profile, settings, store]);

  const isThirdParty = isThirdPartyService(settings);

  // TODO: remove this once Nostr is fully implemented
  const login = async () => {
    if (serviceConfig(settings)) {
      // Let the host page handle the login request
      frameSync.notifyHost('loginRequested');
      return;
    }

    try {
      await auth.login();

      store.closeSidebarPanel('loginPrompt');
      store.clearGroups();
      session.reload();
    } catch (err) {
      toastMessenger.error(err.message);
    }
  };

  // TODO: remove this once Nostr is fully implemented
  const signUp = () => {
    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      frameSync.notifyHost('signupRequested');
      return;
    }
    window.open(store.getLink('signup'));
  };

  const promptToLogout = async () => {
    const drafts = store.countDrafts();
    if (drafts === 0) {
      return true;
    }

    let message = '';
    if (drafts === 1) {
      message =
        'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (drafts > 1) {
      message =
        'You have ' +
        drafts +
        ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }

    return confirm({
      title: 'Discard drafts?',
      message,
      confirmAction: 'Discard',
    });
  };

  const nostrLogout = async () => {
    if (!(await promptToLogout())) {
      return;
    }

    store.removeAnnotations(store.unsavedAnnotations());
    store.discardAllDrafts();
    nostrSettings.setPrivateKey(null);
  };

  return (
    <div
      className={classnames(
        'h-full min-h-full overflow-auto',
        // Precise padding to align with annotation cards in content
        // Larger padding on bottom for wide screens
        'lg:pb-16 bg-grey-2',
        'js-thread-list-scroll-root',
        {
          'theme-clean': isThemeClean,
          // Make room at top for the TopBar (40px) plus custom padding (9px)
          // but not in the Notebook or Profile, which don't use the TopBar
          'pt-[49px]': !isModalRoute,
          'p-4 lg:p-12': isModalRoute,
        },
      )}
      data-testid="hypothesis-app"
      style={backgroundStyle}
    >
      {!isModalRoute && (
        <TopBar
          onNostrLogout={nostrLogout}
          isSidebar={isSidebar}
        />
      )}
      <div className="container">
        <ToastMessages />
        <HelpPanel />
        <SearchPanel />
        <ShareDialog shareTab={!isThirdParty} />
        <NostrConnectPanel
          onClose={() => store.toggleSidebarPanel('nostrConnect')}
          onSavePrivateKey={privateKey =>
            nostrSettings.setPrivateKey(privateKey)
          }
        />

        {route && (
          <main>
            {route === 'annotation' && <AnnotationView onLogin={login} />}
            {route === 'notebook' && <NotebookView />}
            {route === 'profile' && <ProfileView />}
            {route === 'stream' && <StreamView />}
            {route === 'sidebar' && (
              <SidebarView onLogin={login} onSignUp={signUp} />
            )}
          </main>
        )}
      </div>
    </div>
  );
}

export default withServices(HypothesisApp, [
  'auth',
  'frameSync',
  'session',
  'settings',
  'toastMessenger',
  'nostrSettings',
]);
