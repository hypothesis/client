'use strict';

const analyticsService = require('../analytics');

describe('analytics', function() {
  let $windowStub;
  let svc;

  beforeEach(function() {
    $windowStub = {
      ga: sinon.stub(),
      location: {
        href: '',
        protocol: 'https:',
      },
      document: {
        referrer: '',
      },
    };

    svc = analyticsService($windowStub, { appType: 'embed' });
  });

  function checkEventSent(
    category,
    event,
    label = undefined,
    value = undefined
  ) {
    assert.calledWith(
      $windowStub.ga,
      'send',
      'event',
      category,
      event,
      label,
      value
    );
  }

  describe('applying global category based on environment contexts', function() {
    it('sets the category to match the appType setting value', function() {
      const validTypes = ['chrome-extension', 'embed', 'bookmarklet', 'via'];
      validTypes.forEach(function(appType, index) {
        analyticsService($windowStub, { appType: appType }).track(
          'event' + index
        );
        checkEventSent(appType, 'event' + index);
      });
    });

    it('sets category as embed if no other matches can be made', function() {
      analyticsService($windowStub).track('eventA');
      checkEventSent('embed', 'eventA');
    });

    it('sets category as via if url matches the via uri pattern', function() {
      $windowStub.document.referrer = 'https://via.hypothes.is/';
      analyticsService($windowStub).track('eventA');
      checkEventSent('via', 'eventA');

      // match staging as well
      $windowStub.document.referrer = 'https://qa-via.hypothes.is/';
      analyticsService($windowStub).track('eventB');
      checkEventSent('via', 'eventB');
    });

    it('sets category as chrome-extension if protocol matches chrome-extension:', function() {
      $windowStub.location.protocol = 'chrome-extension:';
      analyticsService($windowStub).track('eventA');
      checkEventSent('chrome-extension', 'eventA');
    });
  });

  describe('#track', () => {
    it('allows custom labels to be sent for an event', function() {
      svc.track('eventA', 'labelA');
      checkEventSent('embed', 'eventA', 'labelA');
    });

    it('allows custom metricValues to be sent for an event', function() {
      svc.track('eventA', null, 242.2);
      checkEventSent('embed', 'eventA', null, 242.2);
    });

    it('allows custom metricValues and labels to be sent for an event', function() {
      svc.track('eventA', 'labelabc', 242.2);
      checkEventSent('embed', 'eventA', 'labelabc', 242.2);
    });
  });

  describe('#sendPageView', () => {
    it('sends a page view hit', () => {
      svc.sendPageView();
      assert.calledWith($windowStub.ga, 'send', 'pageview');
    });
  });

  context('when Google Analytics is not loaded', () => {
    it('analytics methods can be called but do nothing', () => {
      const ga = $windowStub.ga;
      delete $windowStub.ga;
      const svc = analyticsService($windowStub, {});

      svc.track('someEvent');
      svc.sendPageView();

      assert.notCalled(ga);
    });
  });

  it('sends events to the current analytics.js command queue', () => {
    const initialQueue = $windowStub.ga;
    const queueAfterLoad = sinon.stub();

    // Send a page view hit before analytics.js loads.
    svc.sendPageView();

    assert.called($windowStub.ga);

    // Simulate analytics.js loading, which will replace the command queue.
    $windowStub.ga = queueAfterLoad;
    initialQueue.reset();

    // Report a user interaction after analytics.js loads.
    svc.track('someEvent');

    // Check that the event was passed to the right queue.
    assert.notCalled(initialQueue);
    assert.called(queueAfterLoad);
    checkEventSent('embed', 'someEvent');
  });
});
