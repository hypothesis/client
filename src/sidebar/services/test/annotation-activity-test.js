import * as fixtures from '../../test/annotation-fixtures';
import { AnnotationActivityService, $imports } from '../annotation-activity';

describe('AnnotationActivityService', () => {
  let fakePermissions;
  let fakePostMessageJsonRpc;

  let fakeRpcSettings;
  let fakeReportActivity;
  let fakeSettings;

  beforeEach(() => {
    fakePermissions = {
      isShared: sinon.stub().returns(true),
    };

    fakePostMessageJsonRpc = {
      notify: sinon.stub(),
    };

    fakeRpcSettings = {
      targetFrame: window,
      origin: 'https://www.example.com',
    };

    fakeReportActivity = {
      method: 'remoteMethod',
      events: ['create', 'update'],
    };

    fakeSettings = {
      reportActivity: fakeReportActivity,
      rpc: fakeRpcSettings,
    };

    $imports.$mock({
      '../helpers/permissions': fakePermissions,
      '../util/postmessage-json-rpc': fakePostMessageJsonRpc,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('#reportActivity', () => {
    it('invokes remote activity method if configured for annotation event type', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      assert.calledOnce(fakePostMessageJsonRpc.notify);
      assert.calledWith(
        fakePostMessageJsonRpc.notify,
        window,
        'https://www.example.com',
        'remoteMethod',
      );
    });

    it('invokes remote method with eventType and data arguments', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      const eventType = fakePostMessageJsonRpc.notify.getCall(0).args[3][0];
      const data = fakePostMessageJsonRpc.notify.getCall(0).args[3][1];

      assert.equal(eventType, 'update');
      assert.deepEqual(data, {
        // Creating a new Date here is necessary to account for precision differences
        // betwen server dates (microsecond precision) and JS (millisecond)
        date: new Date(annotation.updated).toISOString(),
        annotation: {
          id: annotation.id,
          isShared: true,
        },
      });
    });

    it('does not invoke remote activity method if RPC configuration not present', () => {
      const svc = new AnnotationActivityService({
        reportActivity: fakeReportActivity,
      });
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      assert.notCalled(fakePostMessageJsonRpc.notify);
    });

    it('does not invoke remote activity method if reportActivity not configured', () => {
      const svc = new AnnotationActivityService({ rpc: fakeRpcSettings });
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      assert.notCalled(fakePostMessageJsonRpc.notify);
    });

    it('does not invoke remote activity method if annotation event type is not one of configured events', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('delete', annotation);

      assert.notCalled(fakePostMessageJsonRpc.notify);
    });

    it('uses annotation created date as `date` for `create` events', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('create', annotation);

      const data = fakePostMessageJsonRpc.notify.getCall(0).args[3][1];

      assert.equal(data.date, new Date(annotation.created).toISOString());
    });

    it('uses annotation updated date as `date` for `update` events', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      const data = fakePostMessageJsonRpc.notify.getCall(0).args[3][1];

      assert.equal(data.date, new Date(annotation.updated).toISOString());
    });

    describe('using current time for other event type dates', () => {
      let clock;
      let now;

      beforeAll(() => {
        now = new Date();
        clock = sinon.useFakeTimers(now);
      });

      afterAll(() => {
        clock.restore();
      });

      it('uses current date as date for other event types', () => {
        fakeReportActivity.events = ['delete'];
        const svc = new AnnotationActivityService(fakeSettings);
        const annotation = fixtures.defaultAnnotation();

        svc.reportActivity('delete', annotation);

        const data = fakePostMessageJsonRpc.notify.getCall(0).args[3][1];
        assert.equal(data.date, now.toISOString());
      });
    });
  });

  describe('#notifyUnsavedChanges', () => {
    [true, false].forEach(unsaved => {
      it('sends reportUnsavedChanges notification with unsaved state', () => {
        const svc = new AnnotationActivityService(fakeSettings);

        svc.notifyUnsavedChanges(unsaved);

        assert.calledOnce(fakePostMessageJsonRpc.notify);
        assert.calledWith(
          fakePostMessageJsonRpc.notify,
          window,
          'https://www.example.com',
          'reportUnsavedChanges',
          [{ unsaved }],
        );
      });
    });

    it('does not send notification if RPC is not configured', () => {
      const svc = new AnnotationActivityService({});
      svc.notifyUnsavedChanges(true);
      assert.notCalled(fakePostMessageJsonRpc.notify);
    });
  });
});
