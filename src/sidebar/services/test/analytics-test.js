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

  describe('trackEvent', () => {
    it('creates an event through the API', () => {
      analyticsService.trackEvent('client.realtime.apply_updates');

      assert.calledWith(
        fakeAPIService.analytics.events.create,
        {},
        { event: 'client.realtime.apply_updates' },
      );
    });

    it('logs ', async () => {
      const error = new Error('something failed');
      fakeAPIService.analytics.events.create.rejects(error);
      sinon.stub(console, 'warn');

      try {
        analyticsService.trackEvent('client.realtime.apply_updates');

        // Wait for next tick so that the API call promise settles
        await Promise.resolve();

        assert.calledWith(
          console.warn,
          'Could not track event "client.realtime.apply_updates"',
          error,
        );
      } finally {
        console.warn.restore();
      }
    });
  });
});
