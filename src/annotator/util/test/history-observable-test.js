'use strict';

const historyObservable = require('../history-observable');

describe('annotator.util.history-observer', () => {
  const ORIG_URL = 'https://example.com';
  const NEW_URL = 'https://example.com/new-url';

  let fakeHistory;
  let fakeLocation;

  beforeEach(() => {
    fakeHistory = {
      pushState: sinon.stub(),
      replaceState: sinon.stub(),
      popState: sinon.stub(),
    };

    fakeLocation = {
      href: ORIG_URL,
    };
  });

  function observeHistory(callback) {
    const observable = historyObservable(fakeHistory, fakeLocation);
    const subscription = observable.subscribe({
      next: callback,
    });
    return subscription;
  }

  it('reports URL changes that happen via `history.pushState`', () => {
    const urlChanged = sinon.stub();
    observeHistory(urlChanged);

    fakeLocation.href = NEW_URL;
    fakeHistory.pushState({}, 'A title', NEW_URL);

    assert.calledWith(urlChanged, NEW_URL);
  });

  it('reports URL changes that happen via `history.replaceState`', () => {
    const urlChanged = sinon.stub();
    observeHistory(urlChanged);

    fakeLocation.href = NEW_URL;
    fakeHistory.replaceState({}, 'A title', NEW_URL);

    assert.calledWith(urlChanged, NEW_URL);
  });

  it('reports URL changes that happen via `history.popState`', () => {
    const urlChanged = sinon.stub();
    observeHistory(urlChanged);

    fakeLocation.href = NEW_URL;
    fakeHistory.popState();

    assert.calledWith(urlChanged, NEW_URL);
  });

  it('does not report a change if the URL remains the same', () => {
    const urlChanged = sinon.stub();
    observeHistory(urlChanged);

    fakeLocation.href = ORIG_URL;
    fakeHistory.replaceState({}, 'A title', ORIG_URL);

    assert.notCalled(urlChanged);
  });

  it('reports multiple URL changes', () => {
    const urls = [
      'https://example.com/first',
      'https://example.com/second',
      'https://example.com/third',
    ];
    const urlChanged = sinon.stub();
    observeHistory(urlChanged);

    urls.forEach(url => {
      fakeLocation.href = url;
      fakeHistory.replaceState({}, 'A title', url);

      assert.calledWith(urlChanged, url);
      urlChanged.reset();
    });
  });

  it('does not report URL changes after unsubscribing', () => {
    const urlChanged = sinon.stub();
    const subscription = observeHistory(urlChanged);

    subscription.unsubscribe();
    fakeLocation.href = NEW_URL;
    fakeHistory.replaceState({}, 'A title', NEW_URL);

    assert.notCalled(urlChanged);
  });
});
