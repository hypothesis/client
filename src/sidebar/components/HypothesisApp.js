import classnames from 'classnames';
import { createElement } from 'preact';
import { useEffect, useMemo } from 'preact/hooks';
import propTypes from 'prop-types';

import bridgeEvents from '../../shared/bridge-events';
import serviceConfig from '../config/service-config';
import { useStoreProxy } from '../store/use-store';
import { parseAccountID } from '../helpers/account-id';
import { shouldAutoDisplayTutorial } from '../helpers/session';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';

import AnnotationView from './AnnotationView';
import SidebarView from './SidebarView';
import StreamView from './StreamView';

import HelpPanel from './HelpPanel';
import NotebookView from './NotebookView';
import ShareAnnotationsPanel from './ShareAnnotationsPanel';
import ToastMessages from './ToastMessages';
import TopBar from './TopBar';

/**
 * @typedef {import('../../types/api').Profile} Profile
 * @typedef {import('../services/service-url').ServiceUrlGetter} ServiceUrlGetter
 * @typedef {import('../../types/config').MergedConfig} MergedConfig
 * @typedef {import('../../shared/bridge').default} Bridge
 */

/**
 * Return the user's authentication status from their profile.
 *
 * @param {Profile} profile - The profile object from the API.
 */
function authStateFromProfile(profile) {
  const parsed = parseAccountID(profile.userid);
  if (parsed) {
    let displayName = parsed.username;
    if (profile.user_info && profile.user_info.display_name) {
      displayName = profile.user_info.display_name;
    }
    return {
      status: 'logged-in',
      displayName,
      userid: profile.userid,
      username: parsed.username,
      provider: parsed.provider,
    };
  } else {
    return { status: 'logged-out' };
  }
}

/**
 * @typedef HypothesisAppProps
 * @prop {Object} auth
 * @prop {Bridge} bridge
 * @prop {ServiceUrlGetter} serviceUrl
 * @prop {MergedConfig} settings
 * @prop {Object} session
 * @prop {Object} toastMessenger
 */

/**
 * The root component for the Hypothesis client.
 *
 * This handles login/logout actions and renders the top navigation bar
 * and content appropriate for the current route.
 *
 * @param {HypothesisAppProps} props
 */
function HypothesisApp({
  auth,
  bridge,
  serviceUrl,
  settings,
  session,
  toastMessenger,
}) {
  const store = useStoreProxy();
  const hasFetchedProfile = store.hasFetchedProfile();
  const profile = store.profile();
  const route = store.route();

  const authState = useMemo(() => {
    if (!hasFetchedProfile) {
      return { status: 'unknown' };
    }
    return authStateFromProfile(profile);
  }, [hasFetchedProfile, profile]);

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
      bridge.call(bridgeEvents.LOGIN_REQUESTED);
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
      bridge.call(bridgeEvents.SIGNUP_REQUESTED);
      return;
    }
    window.open(serviceUrl('signup'));
  };

  const promptToLogout = () => {
    // TODO - Replace this with a UI which doesn't look terrible.
    let text = '';
    const drafts = store.countDrafts();
    if (drafts === 1) {
      text =
        'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (drafts > 1) {
      text =
        'You have ' +
        drafts +
        ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }
    return drafts === 0 || window.confirm(text);
  };

  const logout = () => {
    if (!promptToLogout()) {
      return;
    }
    store.clearGroups();
    store.removeAnnotations(store.unsavedAnnotations());
    store.discardAllDrafts();

    if (serviceConfig(settings)) {
      bridge.call(bridgeEvents.LOGOUT_REQUESTED);
      return;
    }

    session.logout();
  };

  return (
    <div
      className={classnames('HypothesisApp', 'js-thread-list-scroll-root', {
        'theme-clean': isThemeClean,
        'HypothesisApp--notebook': route === 'notebook',
      })}
      style={backgroundStyle}
    >
      {route !== 'notebook' && (
        <TopBar
          auth={authState}
          onLogin={login}
          onSignUp={signUp}
          onLogout={logout}
          isSidebar={isSidebar}
        />
      )}
      <div className="HypothesisApp__content">
        <ToastMessages />
        <HelpPanel auth={authState} />
        <ShareAnnotationsPanel />

        {route && (
          <main>
            {route === 'annotation' && <AnnotationView onLogin={login} />}
            {route === 'notebook' && <NotebookView />}
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

HypothesisApp.propTypes = {
  auth: propTypes.object,
  bridge: propTypes.object,
  serviceUrl: propTypes.func,
  settings: propTypes.object,
  session: propTypes.object,
  toastMessenger: propTypes.object,
};

HypothesisApp.injectedProps = [
  'auth',
  'bridge',
  'serviceUrl',
  'session',
  'settings',
  'toastMessenger',
];

export default withServices(HypothesisApp);
