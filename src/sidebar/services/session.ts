import type { Profile } from '../../types/api';
import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';
import type { SidebarStore } from '../store';
import { retryPromiseOperation } from '../util/retry';
import * as sentry from '../util/sentry';
import type { APIService } from './api';
import type { AuthService } from './auth';
import type { ToastMessengerService } from './toast-messenger';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * This service handles fetching the user's profile, updating profile settings
 * and logging out.
 *
 * @inject
 */
export class SessionService {
  private _store: SidebarStore;
  private _api: APIService;
  private _auth: AuthService;
  private _toastMessenger: ToastMessengerService;
  private _authority: string | null;
  private _lastLoad: Promise<Profile> | null;
  private _lastLoadTime: number | null;

  constructor(
    store: SidebarStore,
    api: APIService,
    auth: AuthService,
    settings: SidebarSettings,
    toastMessenger: ToastMessengerService,
  ) {
    this._api = api;
    this._auth = auth;
    this._store = store;
    this._toastMessenger = toastMessenger;

    this._authority = serviceConfig(settings)?.authority ?? null;
    this._lastLoad = null;
    this._lastLoadTime = null;

    // Re-fetch profile when user logs in or out in another tab.
    auth.on('oauthTokensChanged', () => this.reload());
  }

  /**
   * Fetch the user's profile from the annotation service.
   *
   * If the profile has been previously fetched within `CACHE_TTL` ms, then this
   * method returns a cached profile instead of triggering another fetch.
   *
   * @return A promise for the user's profile data.
   */
  load(): Promise<Profile> {
    if (
      !this._lastLoad ||
      !this._lastLoadTime ||
      Date.now() - this._lastLoadTime > CACHE_TTL
    ) {
      // The load attempt is automatically retried with a backoff.
      //
      // This serves to make loading the app in the extension cope better with
      // flakey connectivity but it also throttles the frequency of calls to
      // the /app endpoint.
      this._lastLoadTime = Date.now();
      this._lastLoad = retryPromiseOperation(() => {
        const opts = this._authority ? { authority: this._authority } : {};
        return this._api.profile.read(opts);
      })
        .then(session => {
          this.update(session);
          this._lastLoadTime = Date.now();
          return session;
        })
        .catch(err => {
          this._lastLoadTime = null;
          throw err;
        });
    }
    return this._lastLoad;
  }

  /**
   * Store the preference server-side that the user dismissed the sidebar
   * tutorial and then update the local profile data.
   */
  async dismissSidebarTutorial() {
    const updatedProfile = await this._api.profile.update(
      {},
      { preferences: { show_sidebar_tutorial: false } },
    );
    this.update(updatedProfile);
  }

  /**
   * Update the local profile data.
   *
   * This method can be used to update the profile data in the client when new
   * data is pushed from the server via the real-time API.
   *
   * @return The updated profile data
   */
  update(profile: Profile): Profile {
    const prevProfile = this._store.profile();
    const userChanged = profile.userid !== prevProfile.userid;

    this._store.updateProfile(profile);

    this._lastLoad = Promise.resolve(profile);
    this._lastLoadTime = Date.now();

    if (userChanged) {
      // Associate error reports with the current user in Sentry.
      if (profile.userid) {
        sentry.setUserInfo({
          id: profile.userid,
        });
      } else {
        sentry.setUserInfo(null);
      }
    }

    return profile;
  }

  /**
   * Log the user out of the current session and re-fetch the profile.
   */
  async logout() {
    try {
      await this._auth.logout();
      return this.reload();
    } catch (err) {
      this._toastMessenger.error('Log out failed');
      throw new Error(err);
    }
  }

  /**
   * Clear the cached profile information and re-fetch it from the server.
   *
   * This can be used to refresh the user's profile state after logging in.
   *
   * @return {Promise<Profile>}
   */
  reload() {
    this._lastLoad = null;
    this._lastLoadTime = null;
    return this.load();
  }
}
