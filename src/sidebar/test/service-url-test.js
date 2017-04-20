'use strict';

var proxyquire = require('proxyquire');

/** Return a fake annotationUI object. */
function fakeAnnotationUI() {
  var links = null;
  return {
    updateLinks: function(newLinks) {
      links = newLinks;
    },
    getState: function() {
      return {links: links};
    },
  };
}

function createServiceUrl(linksPromise) {
  var replaceURLParams = sinon.stub().returns(
    {url: 'EXPANDED_URL', params: {}}
  );

  var serviceUrlFactory = proxyquire('../service-url', {
    './util/url-util': { replaceURLParams: replaceURLParams },
  });

  var annotationUI = fakeAnnotationUI();

  var store = {
    links: sinon.stub().returns(linksPromise),
  };

  return {
    annotationUI: annotationUI,
    store: store,
    serviceUrl: serviceUrlFactory(annotationUI, store),
    replaceURLParams: replaceURLParams,
  };
}

describe('links', function () {

  beforeEach(function() {
    sinon.stub(console, 'warn');
  });

  afterEach(function () {
    console.warn.restore();
  });

  context('before the API response has been received', function() {
    var serviceUrl;
    var store;

    beforeEach(function() {
      // Create a serviceUrl function with an unresolved Promise that will
      // never be resolved - it never receives the links from store.links().
      var parts = createServiceUrl(new Promise(function() {}));

      serviceUrl = parts.serviceUrl;
      store = parts.store;
    });

    it('sends one API request for the links at boot time', function() {
      assert.calledOnce(store.links);
      assert.isTrue(store.links.calledWithExactly());
    });

    it('returns an empty string for any link', function() {
      assert.equal(serviceUrl('foo'), '');
    });

    it('returns an empty string even if link params are given', function() {
      assert.equal(serviceUrl('foo', {bar: 'bar'}), '');
    });
  });

  context('after the API response has been received', function() {
    var annotationUI;
    var linksPromise;
    var replaceURLParams;
    var serviceUrl;

    beforeEach(function() {
      // The links Promise that store.links() will return.
      linksPromise = Promise.resolve({
        first_link: 'http://example.com/first_page/:foo',
        second_link: 'http://example.com/second_page',
      });

      var parts = createServiceUrl(linksPromise);

      annotationUI = parts.annotationUI;
      serviceUrl = parts.serviceUrl;
      replaceURLParams = parts.replaceURLParams;
    });

    it('updates annotationUI with the real links', function() {
      return linksPromise.then(function(links) {
        assert.deepEqual(annotationUI.getState(), {links: links});
      });
    });

    it('calls replaceURLParams with the path and given params', function() {
      return linksPromise.then(function() {
        var params = {foo: 'bar'};

        serviceUrl('first_link', params);

        assert.calledOnce(replaceURLParams);
        assert.deepEqual(
          replaceURLParams.args[0],
          ['http://example.com/first_page/:foo', params]);
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
        var renderedUrl = serviceUrl('first_link');

        assert.equal(renderedUrl, 'EXPANDED_URL');
      });
    });

    it("throws an error if it doesn't have the requested link", function() {
      return linksPromise.then(function() {
        assert.throws(
          function() { serviceUrl('madeUpLinkName'); },
          Error, 'Unknown link madeUpLinkName');
      });
    });

    it('throws an error if replaceURLParams returns unused params', function() {
      var params = {'unused_param_1': 'foo', 'unused_param_2': 'bar'};
      replaceURLParams.returns({
        url: 'EXPANDED_URL',
        params: params,
      });

      return linksPromise.then(function() {
        assert.throws(
          function() { serviceUrl('first_link', params); },
          Error, 'Unknown link parameters: unused_param_1, unused_param_2');
      });
    });
  });
});
