import sinon from 'sinon';

import { AnalyticsService } from '../analytics';

describe('AnalyticsService', () => {
  let fakeAPIService;
  let analyticsService;

  beforeEach(() => {
    fakeAPIService = {
      analytics: {
        events: {
          create: sinon.stub().resolves(),
        },
      },
    };

    analyticsService = new AnalyticsService(fakeAPIService);
  });

  describe('trackApplyPendingUpdatesEvent', () => {
    it('creates an event through the API', () => {
      analyticsService.trackApplyPendingUpdatesEvent();

      assert.calledWith(
        fakeAPIService.analytics.events.create,
        {},
        { event: 'APPLY_PENDING_UPDATES' },
      );
    });

    it('logs ', async () => {
      const error = new Error('something failed');
      fakeAPIService.analytics.events.create.rejects(error);
      sinon.stub(console, 'error');

      try {
        analyticsService.trackApplyPendingUpdatesEvent();

        // Wait for next tick so that the API call promise settles
        await Promise.resolve();

        assert.calledWith(
          console.error,
          'Could not track applying pending updates.',
          error,
        );
      } finally {
        console.error.restore();
      }
    });
  });
});
