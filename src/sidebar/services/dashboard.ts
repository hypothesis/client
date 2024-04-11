import type { SidebarSettings } from '../../types/config';
import * as postMessageJsonRpc from '../util/postmessage-json-rpc';

/**
 * @inject
 */
export class DashboardService {
  private _rpc: SidebarSettings['rpc'];
  private _dashboardConfig: SidebarSettings['dashboard'];

  constructor(settings: SidebarSettings) {
    this._rpc = settings.rpc;
    this._dashboardConfig = settings.dashboard;
  }

  /**
   * Get the auth token via JSON RPC.
   * This method should be called before `open`, to get the authToken that needs
   * to be passed there.
   */
  async getAuthToken(): Promise<string | undefined> {
    if (!this._rpc || !this._dashboardConfig) {
      return undefined;
    }

    return postMessageJsonRpc.call<string>(
      this._rpc.targetFrame,
      this._rpc.origin,
      this._dashboardConfig.authTokenRPCMethod,
    );
  }

  /**
   * Open the dashboard with provided auth token.
   *
   * The auth token should be fetched separately, by calling `getAuthToken`
   * first.
   * It is not done here transparently, so that we can invoke this method as
   * part of a user gesture, and browsers don't end up blocking the new tab
   * opened by the form being submitted later.
   *
   * Related Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1469422
   *
   * @see {getAuthToken}
   */
  open(authToken: string, document_ = document) {
    if (!this._rpc || !this._dashboardConfig) {
      throw new Error(
        'Dashboard cannot be opened due to missing configuration',
      );
    }

    const form = document_.createElement('form');
    form.action = this._dashboardConfig.entryPointURL;
    form.target = '_blank';
    form.method = 'POST';

    const authInput = document_.createElement('input');
    authInput.type = 'hidden';
    authInput.name = this._dashboardConfig.authFieldName;
    authInput.value = authToken;

    form.append(authInput);
    document_.body.append(form);
    form.submit();
    form.remove();
  }
}
