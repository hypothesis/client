'use strict';

const serviceUrlFactory = require('../service-url');

/** Return a fake store object. */
function fakeStore() {
  let links = null;
  return {
    updateLinks: function(newLinks) {
      links = newLinks;
    },
    getState: function() {
      return { links: links };
    },
  };
}

function createServiceUrl(linksPromise) {
  const replaceURLParams = sinon
    .stub()
    .returns({ url: 'EXPANDED_URL', params: {} });

  serviceUrlFactory.$imports.$mock({
    '../util/url-util': { replaceURLParams: replaceURLParams },
  });

  const store = fakeStore();

  const apiRoutes = {
    links: sinon.stub().returns(linksPromise),
  };

  return {
    store: store,
    apiRoutes,
    serviceUrl: serviceUrlFactory(store, apiRoutes),
    replaceURLParams: replaceURLParams,
  };
}

describe('sidebar.service-url', function() {
  beforeEach(function() {
    sinon.stub(console, 'warn');
  });

  afterEach(function() {
    console.warn.restore();
    serviceUrlFactory.$imports.$restore();
  });

  context('before the API response has been received', function() {
    let serviceUrl;
    let apiRoutes;

    beforeEach(function() {
      // Create a serviceUrl function with an unresolved Promise that will
      // never be resolved - it never receives the links from store.links().
      const parts = createServiceUrl(new Promise(function() {}));

      serviceUrl = parts.serviceUrl;
      apiRoutes = parts.apiRoutes;
    });

    it('sends one API request for the links at boot time', function() {
      assert.calledOnce(apiRoutes.links);
      assert.isTrue(apiRoutes.links.calledWithExactly());
    });

    it('returns an empty string for any link', function() {
      assert.equal(serviceUrl('foo'), '');
    });

    it('returns an empty string even if link params are given', function() {
      assert.equal(serviceUrl('foo', { bar: 'bar' }), '');
    });
  });

  context('after the API response has been received', function() {
    let store;
    let linksPromise;
    let replaceURLParams;
    let serviceUrl;

    beforeEach(function() {
      // The links Promise that store.links() will return.
      linksPromise = Promise.resolve({
        first_link: 'http://example.com/first_page/:foo',
        second_link: 'http://example.com/second_page',
      });

      const parts = createServiceUrl(linksPromise);

      store = parts.store;
      serviceUrl = parts.serviceUrl;
      replaceURLParams = parts.replaceURLParams;
    });

    it('updates store with the real links', function() {
      return linksPromise.then(function(links) {
        assert.deepEqual(store.getState(), { links: links });
      });
    });

    it('calls replaceURLParams with the path and given params', function() {
      return linksPromise.then(function() {
        const params = { foo: 'bar' };

        serviceUrl('first_link', params);

        assert.calledOnce(replaceURLParams);
        assert.deepEqual(replaceURLParams.args[0], [
          'http://example.com/first_page/:foo',
          params,
        ]);
      });
    });

    it('passes an empty params object to replaceURLParams if no params are given', function() {
      return linksPromise.then(function() {
        serviceUrl('first_link');

        assert.calledOnce(replaceURLParams);
        assert.deepEqual(replaceURLParams.args[0][1], {});
      });
    });

    it('returns the expanded URL from replaceURLParams', function() {
      return linksPromise.then(function() {
        const renderedUrl = serviceUrl('first_link');

        assert.equal(renderedUrl, 'EXPANDED_URL');
      });
    });

    it("throws an error if it doesn't have the requested link", function() {
      return linksPromise.then(function() {
        assert.throws(
          function() {
            serviceUrl('madeUpLinkName');
          },
          Error,
          'Unknown link madeUpLinkName'
        );
      });
    });

    it('throws an error if replaceURLParams returns unused params', function() {
      const params = { unused_param_1: 'foo', unused_param_2: 'bar' };
      replaceURLParams.returns({
        url: 'EXPANDED_URL',
        params: params,
      });

      return linksPromise.then(function() {
        assert.throws(
          function() {
            serviceUrl('first_link', params);
          },
          Error,
          'Unknown link parameters: unused_param_1, unused_param_2'
        );
      });
    });
  });
});
