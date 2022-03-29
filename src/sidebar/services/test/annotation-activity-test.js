import * as fixtures from '../../test/annotation-fixtures';

import { AnnotationActivityService, $imports } from '../annotation-activity';

describe('AnnotationActivityService', () => {
  let fakePostMessageJsonRpc;

  let fakeRpcSettings;
  let fakeReportActivity;
  let fakeSettings;

  beforeEach(() => {
    fakePostMessageJsonRpc = {
      call: sinon.stub(),
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

      assert.calledOnce(fakePostMessageJsonRpc.call);
      assert.calledWith(
        fakePostMessageJsonRpc.call,
        window,
        'https://www.example.com',
        'remoteMethod'
      );
    });

    it('invokes remote method with eventType and data arguments', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      const eventType = fakePostMessageJsonRpc.call.getCall(0).args[3][0];
      const data = fakePostMessageJsonRpc.call.getCall(0).args[3][1];

      assert.equal(eventType, 'update');
      assert.deepEqual(data, {
        // Creating a new Date here is necessary to account for precision differences
        // betwen server dates (microsecond precision) and JS (millisecond)
        date: new Date(annotation.updated).toISOString(),
        annotation: {
          id: annotation.id,
        },
      });
    });

    it('does not invoke remote activity method if RPC configuration not present', () => {
      const svc = new AnnotationActivityService({
        reportActivity: fakeReportActivity,
      });
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      assert.notCalled(fakePostMessageJsonRpc.call);
    });

    it('does not invoke remote activity method if reportActivity not configured', () => {
      const svc = new AnnotationActivityService({ rpc: fakeRpcSettings });
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      assert.notCalled(fakePostMessageJsonRpc.call);
    });

    it('does not invoke remote activity method if annotation event type is not one of configured events', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('delete', annotation);

      assert.notCalled(fakePostMessageJsonRpc.call);
    });

    it('uses annotation created date as `date` for `create` events', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('create', annotation);

      const data = fakePostMessageJsonRpc.call.getCall(0).args[3][1];

      assert.equal(data.date, new Date(annotation.created).toISOString());
    });

    it('uses annotation updated date as `date` for `update` events', () => {
      const svc = new AnnotationActivityService(fakeSettings);
      const annotation = fixtures.defaultAnnotation();

      svc.reportActivity('update', annotation);

      const data = fakePostMessageJsonRpc.call.getCall(0).args[3][1];

      assert.equal(data.date, new Date(annotation.updated).toISOString());
    });

    describe('using current time for other event type dates', () => {
      let clock;
      let now;

      before(() => {
        now = new Date();
        clock = sinon.useFakeTimers(now);
      });

      after(() => {
        clock.restore();
      });

      it('uses current date as date for other event types', () => {
        fakeReportActivity.events = ['delete'];
        const svc = new AnnotationActivityService(fakeSettings);
        const annotation = fixtures.defaultAnnotation();

        svc.reportActivity('delete', annotation);

        const data = fakePostMessageJsonRpc.call.getCall(0).args[3][1];
        assert.equal(data.date, now.toISOString());
      });
    });
  });
});
