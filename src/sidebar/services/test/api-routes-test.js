import { APIRoutesService, $imports } from '../api-routes';

// Abridged version of the response returned by https://hypothes.is/api,
// with the domain name changed.
const apiIndexResponse = {
  message: 'Annotation Service API',
  links: {
    annotation: {
      read: {
        url: 'https://annotation.service/api/annotations/:id',
        method: 'GET',
        description: 'Fetch an annotation',
      },
    },
    links: {
      url: 'https://annotation.service/api/links',
      method: 'GET',
      description: 'Fetch links to pages on the service',
    },
  },
};

// Abridged version of the response returned by https://hypothes.is/api/links,
// with the domain name changed.
const linksResponse = {
  'forgot-password': 'https://annotation.service/forgot-password',
  help: 'https://annotation.service/docs/help',
  'groups.new': 'https://annotation.service/groups/new',
  'groups.leave': 'https://annotation.service/groups/:id/leave',
  'search.tag': 'https://annotation.service/search?q=tag:":tag"',
  'account.settings': 'https://annotation.service/account/settings',
  'oauth.revoke': 'https://annotation.service/oauth/revoke',
  signup: 'https://annotation.service/signup',
  'oauth.authorize': 'https://annotation.service/oauth/authorize',
};

/**
 * Fake `retryPromiseOperation` that does not wait between retries.
 */
async function fakeRetryPromiseOperation(callback) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await callback();
      return result;
    } catch {
      // Try again
    }
  }
}

describe('APIRoutesService', () => {
  let apiRoutes;
  let fakeSettings;

  function httpResponse(status, data) {
    return Promise.resolve({ status, json: () => Promise.resolve(data) });
  }

  beforeEach(() => {
    // We use a simple sinon stub of `fetch` here rather than `fetch-mock`
    // because this service's usage of fetch is very simple and it makes it
    // easier to mock the retry behavior.
    const fetchStub = sinon.stub(window, 'fetch');

    fetchStub
      .withArgs('https://annotation.service/api/')
      .returns(httpResponse(200, apiIndexResponse));
    fetchStub
      .withArgs('https://annotation.service/api/links')
      .returns(httpResponse(200, linksResponse));

    fakeSettings = {
      apiUrl: 'https://annotation.service/api/',
    };

    apiRoutes = new APIRoutesService(fakeSettings);

    $imports.$mock({
      '../util/retry': { retryPromiseOperation: fakeRetryPromiseOperation },
    });
  });

  afterEach(() => {
    $imports.$restore();
    window.fetch.restore();
  });

  describe('#routes', () => {
    it('returns the route directory', () => {
      return apiRoutes.routes().then(routes => {
        assert.deepEqual(routes, apiIndexResponse.links);
      });
    });

    it('caches the route directory', () => {
      // Call `routes()` multiple times, check that only one HTTP call is made.
      return Promise.all([apiRoutes.routes(), apiRoutes.routes()]).then(
        ([routesA, routesB]) => {
          assert.equal(routesA, routesB);
          assert.equal(window.fetch.callCount, 1);
        }
      );
    });

    it('retries the route fetch until it succeeds', async () => {
      window.fetch
        .withArgs('https://annotation.service/api/')
        .onFirstCall()
        .returns(httpResponse(500, null));

      const routes = await apiRoutes.routes();

      assert.calledTwice(window.fetch);
      assert.deepEqual(routes, apiIndexResponse.links);
    });
  });

  describe('#links', () => {
    it('returns page links', () => {
      return apiRoutes.links().then(links => {
        assert.deepEqual(links, linksResponse);
      });
    });

    it('caches the returned links', () => {
      // Call `links()` multiple times, check that only two HTTP calls are made
      // (one for the index, one for the page links).
      return Promise.all([apiRoutes.links(), apiRoutes.links()]).then(
        ([linksA, linksB]) => {
          assert.equal(linksA, linksB);
          assert.deepEqual(window.fetch.callCount, 2);
        }
      );
    });

    it('retries the link fetch until it succeeds', async () => {
      window.fetch
        .withArgs(apiIndexResponse.links.links.url)
        .onFirstCall()
        .returns(httpResponse(500, null));

      const links = await apiRoutes.links();

      assert.equal(window.fetch.callCount, 3); // One `/api` fetch, two `/api/links` fetches.
      assert.deepEqual(links, linksResponse);
    });
  });
});
