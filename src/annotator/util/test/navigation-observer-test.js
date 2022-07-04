import { NavigationObserver } from '../navigation-observer';

function runTest(initialURL, callback) {
  const onNavigate = sinon.stub();
  const getURL = sinon.stub().returns(initialURL);
  const observer = new NavigationObserver(onNavigate, getURL);
  try {
    callback(observer, onNavigate, getURL);
  } finally {
    observer.disconnect();
  }
}

describe('NavigationObserver', () => {
  context('when the Navigation API is supported', () => {
    it('reports navigation when a "navigatesuccess" event fires', () => {
      runTest('https://example.com/page-1', (observer, onNavigate, getURL) => {
        getURL.returns('https://example.com/page-2');
        window.navigation.dispatchEvent(new Event('navigatesuccess'));
        assert.calledWith(onNavigate, 'https://example.com/page-2');
      });
    });

    it('stops reporting navigations after observer is disconnected', () => {
      runTest('https://example.com/page-1', (observer, onNavigate, getURL) => {
        getURL.returns('https://example.com/page-2');

        observer.disconnect();

        window.navigation.dispatchEvent(new Event('navigatesuccess'));
        assert.notCalled(onNavigate);
      });
    });
  });

  context('when the Navigation API is not supported', () => {
    let origNavigation;

    before(() => {
      origNavigation = window.navigation;
      window.navigation = null;
    });

    after(() => {
      window.navigation = origNavigation;
    });

    it('reports navigation when `history.pushState` is called', () => {
      runTest('https://example.com/page-1', (observer, onNavigate, getURL) => {
        getURL.returns('https://example.com/page-2');
        window.history.pushState({}, null, location.href /* dummy */);
        assert.calledWith(onNavigate, 'https://example.com/page-2');
      });
    });

    it('reports navigation when `history.replaceState` is called', () => {
      runTest('https://example.com/page-1', (observer, onNavigate, getURL) => {
        getURL.returns('https://example.com/page-2');
        window.history.replaceState({}, null, location.href /* dummy */);
        assert.calledWith(onNavigate, 'https://example.com/page-2');
      });
    });

    it('reports navigation when a "popstate" event fires', () => {
      runTest('https://example.com/page-1', (observer, onNavigate, getURL) => {
        getURL.returns('https://example.com/page-2');
        window.dispatchEvent(new Event('popstate'));
        assert.calledWith(onNavigate, 'https://example.com/page-2');
      });
    });

    it('stops reporting navigations after observer is disconnected', () => {
      runTest('https://example.com/page-1', (observer, onNavigate, getURL) => {
        getURL.returns('https://example.com/page-2');

        observer.disconnect();
        window.history.pushState({}, null, location.href /* dummy */);

        assert.notCalled(onNavigate);
      });
    });
  });

  [
    // Path change
    {
      oldURL: 'https://example.com/path-1',
      newURL: 'https://example.com/path-2',
      shouldFire: true,
    },

    // Query param change
    {
      oldURL: 'https://example.com/path?page=1',
      newURL: 'https://example.com/path?page=2',
      shouldFire: true,
    },

    // Hash fragment change
    {
      oldURL: 'https://example.com/path#section-1',
      newURL: 'https://example.com/path#section-2',
      shouldFire: false,
    },

    {
      oldURL: 'https://example.com/path#section-1',
      newURL: 'https://example.com/path',
      shouldFire: false,
    },
  ].forEach(({ oldURL, newURL, shouldFire }) => {
    it('only fires an event if the path or query params change', () => {
      runTest(oldURL, (observer, onNavigate, getURL) => {
        getURL.returns(newURL);

        window.navigation.dispatchEvent(new Event('navigatesuccess'));

        if (shouldFire) {
          assert.calledWith(onNavigate, newURL);
        } else {
          assert.notCalled(onNavigate);
        }
      });
    });
  });
});
