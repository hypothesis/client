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

  open() {
    if (!this._rpc || !this._dashboardConfig) {
      return;
    }

    postMessageJsonRpc.notify(
      this._rpc.targetFrame,
      this._rpc.origin,
      this._dashboardConfig.entryPointRPCMethod,
    );
  }
}
