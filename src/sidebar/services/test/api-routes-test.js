'use strict';

var apiRoutesFactory = require('../api-routes');

// Abridged version of the response returned by https://hypothes.is/api,
// with the domain name changed.
var apiIndexResponse = {
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
var linksResponse = {
  'forgot-password': 'https://annotation.service/forgot-password',
  'help': 'https://annotation.service/docs/help',
  'groups.new': 'https://annotation.service/groups/new',
  'groups.leave': 'https://annotation.service/groups/:id/leave',
  'search.tag': 'https://annotation.service/search?q=tag:":tag"',
  'account.settings': 'https://annotation.service/account/settings',
  'oauth.revoke': 'https://annotation.service/oauth/revoke',
  'signup': 'https://annotation.service/signup',
  'oauth.authorize': 'https://annotation.service/oauth/authorize',
};

describe('sidebar.api-routes', () => {
  var apiRoutes;
  var fakeHttp;
  var fakeSettings;

  function httpResponse(status, data) {
    return Promise.resolve({ status, data });
  }

  beforeEach(() => {
    // Use a Sinon stub rather than Angular's fake $http service here to avoid
    // the hassles that come with mixing `$q` and regular promises.
    fakeHttp = {
      get: sinon.stub(),
    };

    fakeHttp.get.withArgs('https://annotation.service/api/')
      .returns(httpResponse(200, apiIndexResponse));
    fakeHttp.get.withArgs('https://annotation.service/api/links')
      .returns(httpResponse(200, linksResponse));

    fakeSettings = {
      apiUrl: 'https://annotation.service/api/',
    };

    apiRoutes = apiRoutesFactory(fakeHttp, fakeSettings);
  });

  describe('#routes', () => {
    it('returns the route directory', () => {
      return apiRoutes.routes().then(routes => {
        assert.deepEqual(routes, apiIndexResponse.links);
      });
    });

    it('caches the route directory', () => {
      // Call `routes()` multiple times, check that only one HTTP call is made.
      return Promise.all([apiRoutes.routes(), apiRoutes.routes()])
        .then(([routesA, routesB]) => {
          assert.equal(routesA, routesB);
          assert.equal(fakeHttp.get.callCount, 1);
        });
    });

    it('retries the route fetch until it succeeds', () => {
      fakeHttp.get.onFirstCall().returns(httpResponse(500, null));
      return apiRoutes.routes().then(routes => {
        assert.deepEqual(routes, apiIndexResponse.links);
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
      return Promise.all([apiRoutes.links(), apiRoutes.links()])
        .then(([linksA, linksB]) => {
          assert.equal(linksA, linksB);
          assert.deepEqual(fakeHttp.get.callCount, 2);
        });
    });
  });
});
