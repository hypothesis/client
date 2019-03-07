'use strict';

const apiRoutesFactory = require('../api-routes');

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

describe('sidebar.api-routes', () => {
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

    apiRoutes = apiRoutesFactory(fakeSettings);
  });

  afterEach(() => {
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

    it('retries the route fetch until it succeeds', () => {
      window.fetch.onFirstCall().returns(httpResponse(500, null));
      return apiRoutes.routes().then(routes => {
        assert.deepEqual(routes, apiIndexResponse.links);
      });
    });

    it('sends client version custom request header', () => {
      return apiRoutes.routes().then(() => {
        assert.calledWith(window.fetch, fakeSettings.apiUrl, {
          headers: { 'Hypothesis-Client-Version': '__VERSION__' },
        });
      });
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
  });
});
