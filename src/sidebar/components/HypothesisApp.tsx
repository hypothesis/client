import { confirm } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useMemo } from 'preact/hooks';

import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import { isThirdPartyService } from '../helpers/is-third-party-service';
import {
  shouldAutoDisplayTutorial,
  shouldShowYoutubeDisclaimer,
} from '../helpers/session';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import type { AuthService } from '../services/auth';
import type { FrameSyncService } from '../services/frame-sync';
import type { SessionService } from '../services/session';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import AnnotationView from './AnnotationView';
import HelpPanel from './HelpPanel';
import InstructorSurveyPanel from './InstructorSurveyPanel';
import NotebookView from './NotebookView';
import ProfileView from './ProfileView';
import SharePanel from './SharePanel';
import SidebarView from './SidebarView';
import StreamView from './StreamView';
import ToastMessages from './ToastMessages';
import TopBar from './TopBar';
import YouTubeDisclaimerBanner from './YouTubeDisclaimerBanner';
import SearchPanel from './search/SearchPanel';

export type HypothesisAppProps = {
  auth: AuthService;
  frameSync: FrameSyncService;
  settings: SidebarSettings;
  session: SessionService;
  toastMessenger: ToastMessengerService;
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
  // One state drives the survey panel, the blocking of the content below it and
  // the scroll lock that keeps the panel in place.
  const surveyShown = isSidebar && store.isInstructorSurveyPending();

  useEffect(() => {
    if (shouldAutoDisplayTutorial(isSidebar, profile, settings)) {
      store.openSidebarPanel('help');
    }
  }, [isSidebar, profile, settings, store]);

  const isThirdParty = isThirdPartyService(settings);

  const loginOrSignUp = async (action: 'login' | 'signup') => {
    try {
      await auth.login({ action });

      store.closeSidebarPanel('loginPrompt');
      store.clearGroups();
      session.reload();
    } catch (err) {
      toastMessenger.error(err.message);
    }
  };

  const login = async () => {
    if (serviceConfig(settings)) {
      // Let the host page handle the login request
      frameSync.notifyHost('loginRequested');
      return;
    }
    await loginOrSignUp('login');
  };

  const signUp = async () => {
    if (serviceConfig(settings)) {
      // Let the host page handle the signup request
      frameSync.notifyHost('signupRequested');
      return;
    }
    await loginOrSignUp('signup');
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

  const logout = async () => {
    if (!(await promptToLogout())) {
      return;
    }
    store.clearGroups();
    store.removeAnnotations(store.unsavedAnnotations());
    store.discardAllDrafts();

    if (serviceConfig(settings)) {
      frameSync.notifyHost('logoutRequested');
      return;
    }

    session.logout();
  };

  return (
    <div
      className={classnames(
        'h-full min-h-full',
        // Precise padding to align with annotation cards in content
        // Larger padding on bottom for wide screens
        'lg:pb-16 bg-grey-2',
        'js-thread-list-scroll-root',
        {
          // Pin the survey panel by taking the scroll away from the root.
          // Help, Search and Share open below it and can be clipped on a short
          // sidebar, but each has its own close button, so nobody is stuck.
          'overflow-auto': !surveyShown,
          'overflow-hidden': surveyShown,
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
          onLogin={login}
          onSignUp={signUp}
          onLogout={logout}
          isSidebar={isSidebar}
        />
      )}
      {!isModalRoute && shouldShowYoutubeDisclaimer(settings, profile) && (
        <YouTubeDisclaimerBanner />
      )}
      <div className="container">
        <ToastMessages />
        {surveyShown && <InstructorSurveyPanel />}
        <HelpPanel />
        <SearchPanel />
        <SharePanel shareTab={!isThirdParty} />

        {route && (
          // `inert` rather than `pointer-events-none` plus `aria-hidden`: it is
          // the only one of the three that also stops Tab reaching the content,
          // and it takes the subtree out of the accessibility tree by itself.
          // Wrapping `<main>` and nothing else keeps Help, Search and Share --
          // siblings inside `.container` -- usable from the top bar, and keeps
          // ToastMessages outside, so the error toast from a failed answer can
          // still be read and dismissed.
          <main
            className={classnames({ 'opacity-50': surveyShown })}
            inert={surveyShown}
          >
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
]);
