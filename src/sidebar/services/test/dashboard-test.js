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
      authTokenRPCMethod: 'requestAuthToken',
      entryPointURL: '/open/dashboard',
      authFieldName: 'authorization',
    };
    fakePostMessageJsonRpc = {
      call: sinon.stub(),
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

  describe('getAuthToken', () => {
    [
      { withRpc: false },
      { withDashboard: false },
      { withRpc: false, withDashboard: false },
    ].forEach(settings => {
      it('does not call frame if there is any missing config', async () => {
        const dashboard = createDashboardService(settings);
        await dashboard.getAuthToken();
        assert.notCalled(fakePostMessageJsonRpc.call);
      });
    });

    it('calls frame to get the authToken', async () => {
      fakePostMessageJsonRpc.call.resolves('the_token');
      const dashboard = createDashboardService();

      const result = await dashboard.getAuthToken();

      assert.equal(result, 'the_token');
      assert.calledWith(
        fakePostMessageJsonRpc.call,
        window,
        'https://www.example.com',
        'requestAuthToken',
      );
    });
  });

  describe('open', () => {
    [
      { withRpc: false },
      { withDashboard: false },
      { withRpc: false, withDashboard: false },
    ].forEach(settings => {
      it('throws error if there is any missing config', () => {
        const dashboard = createDashboardService(settings);

        assert.throws(
          () => dashboard.open('auth_token'),
          'Dashboard cannot be opened due to missing configuration',
        );
      });
    });

    it('submits form with auth token', () => {
      const fakeForm = {
        append: sinon.stub(),
        submit: sinon.stub(),
        remove: sinon.stub(),
      };
      const fakeInput = {};
      const fakeDocument = {
        createElement: tagName => (tagName === 'form' ? fakeForm : fakeInput),
        body: {
          append: sinon.stub(),
        },
      };

      const dashboard = createDashboardService();

      dashboard.open('auth_token', fakeDocument);

      assert.equal(fakeForm.action, fakeDashboard.entryPointURL);
      assert.equal(fakeInput.name, fakeDashboard.authFieldName);
      assert.equal(fakeInput.value, 'auth_token');
      assert.calledWith(fakeDocument.body.append, fakeForm);
      assert.calledWith(fakeForm.append, fakeInput);
      assert.called(fakeForm.submit);
      assert.called(fakeForm.remove);
    });
  });
});
