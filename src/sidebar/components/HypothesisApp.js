import classnames from 'classnames';
import { useEffect, useMemo } from 'preact/hooks';

import { confirm } from '../../shared/prompts';
import { serviceConfig } from '../config/service-config';
import { shouldAutoDisplayTutorial } from '../helpers/session';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';

import AnnotationView from './AnnotationView';
import SidebarView from './SidebarView';
import StreamView from './StreamView';

import HelpPanel from './HelpPanel';
import NotebookView from './NotebookView';
import ProfileView from './ProfileView';
import ShareAnnotationsPanel from './ShareAnnotationsPanel';
import ToastMessages from './ToastMessages';
import TopBar from './TopBar';

/**
 * @typedef {import('../../types/config').SidebarSettings} SidebarSettings
 */

/**
 * @typedef HypothesisAppProps
 * @prop {import('../services/auth').AuthService} auth
 * @prop {import('../services/frame-sync').FrameSyncService} frameSync
 * @prop {SidebarSettings} settings
 * @prop {import('../services/session').SessionService} session
 * @prop {import('../services/toast-messenger').ToastMessengerService} toastMessenger
 */

/**
 * The root component for the Hypothesis client.
 *
 * This handles login/logout actions and renders the top navigation bar
 * and content appropriate for the current route.
 *
 * @param {HypothesisAppProps} props
 */
function HypothesisApp({ auth, frameSync, settings, session, toastMessenger }) {
  const store = useSidebarStore();
  const profile = store.profile();
  const route = store.route();

  const backgroundStyle = useMemo(
    () => applyTheme(['appBackgroundColor'], settings),
    [settings]
  );
  const isThemeClean = settings.theme === 'clean';

  const isSidebar = route === 'sidebar';

  useEffect(() => {
    if (shouldAutoDisplayTutorial(isSidebar, profile, settings)) {
      store.openSidebarPanel('help');
    }
  }, [isSidebar, profile, settings, store]);

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
        'h-full min-h-full overflow-scroll',
        // Precise padding to align with annotation cards in content
        // Larger padding on bottom for wide screens
        'lg:pb-16 bg-grey-2',
        'js-thread-list-scroll-root',
        {
          'theme-clean': isThemeClean,
          // Make room at top for the TopBar (40px) plus custom padding (9px)
          // but not in the Notebook or Profile, which don't use the TopBar
          'pt-[49px]': route !== 'notebook',
          'p-4 lg:p-12': route === 'notebook' || route === 'profile',
        }
      )}
      data-testid="hypothesis-app"
      style={backgroundStyle}
    >
      {route !== 'notebook' && (
        <TopBar
          onLogin={login}
          onSignUp={signUp}
          onLogout={logout}
          isSidebar={isSidebar}
        />
      )}
      <div className="container">
        <ToastMessages />
        <HelpPanel />
        <ShareAnnotationsPanel />

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
]);
