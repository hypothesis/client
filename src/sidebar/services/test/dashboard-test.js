import sinon from 'sinon';

import { DashboardService, $imports } from '../dashboard';

describe('DashboardService', () => {
  let fakeRpc;
  let fakeDashboard;
  let fakePostMessageJsonRpc;

  beforeEach(() => {
    fakeRpc = {
      targetFrame: window,
      origin: 'https://www.example.com',
    };
    fakeDashboard = {
      entryPointRPCMethod: 'openDashboard',
    };
    fakePostMessageJsonRpc = {
      notify: sinon.stub(),
    };

    $imports.$mock({
      '../util/postmessage-json-rpc': fakePostMessageJsonRpc,
    });
  });

  afterEach(() => $imports.$restore());

  function createDashboardService({
    withRpc = true,
    withDashboard = true,
  } = {}) {
    return new DashboardService({
      rpc: withRpc ? fakeRpc : undefined,
      dashboard: withDashboard ? fakeDashboard : undefined,
    });
  }

  describe('open', () => {
    [
      { withRpc: false },
      { withDashboard: false },
      { withRpc: false, withDashboard: false },
    ].forEach(settings => {
      it('does not notify frame if there is any missing config', () => {
        const dashboard = createDashboardService(settings);
        dashboard.open();
        assert.notCalled(fakePostMessageJsonRpc.notify);
      });
    });

    it('notifies frame to open the dashboard', () => {
      const dashboard = createDashboardService();
      dashboard.open();
      assert.calledWith(
        fakePostMessageJsonRpc.notify,
        window,
        'https://www.example.com',
        'openDashboard',
      );
    });
  });
});
