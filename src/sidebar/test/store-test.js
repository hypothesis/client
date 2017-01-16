'use strict';

var angular = require('angular');
var proxyquire = require('proxyquire');

var util = require('../../shared/test/util');

describe('store', function () {
  var $httpBackend = null;
  var sandbox = null;
  var store = null;

  before(function () {
    angular.module('h')
      .service('store', proxyquire('../store', util.noCallThru({
        angular: angular,
        './retry-util': {
          retryPromiseOperation: function (fn) {
            return fn();
          },
        },
      })));
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    var fakeTokenGetter = function () {
      return Promise.resolve('faketoken');
    };

    angular.mock.module('h', {
      auth: {
        tokenGetter: fakeTokenGetter,
      },
      settings: {apiUrl: 'http://example.com/api'},
    });
  });

  /**
   * Wrapper around $httpBackend.flush() which allows for methods under test
   * needing to fetch data using Promise-returning functions before they
   * actually make an HTTP request.
   *
   * @param {number} [maxTicks] - Maximum number of event loop turns to wait.
   */
  function flushHttpRequests(maxTicks) {
    try {
      $httpBackend.flush();
      return null;
    } catch (err) {
      if (maxTicks === 0) {
        throw new Error('No HTTP request was made');
      }
      // No HTTP request was made yet. Try again on the next tick of the event
      // loop.
      maxTicks = maxTicks || 5;
      return Promise.resolve().then(function () {
        flushHttpRequests(maxTicks - 1);
      });
    }
  }

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    sandbox.restore();
  });

  beforeEach(angular.mock.inject(function (_$httpBackend_, _store_) {
    $httpBackend = _$httpBackend_;
    store = _store_;

    $httpBackend.expectGET('http://example.com/api').respond({
      links: {
        annotation: {
          create: {
            method: 'POST',
            url: 'http://example.com/api/annotations',
          },
          delete: {
            method: 'DELETE',
            url: 'http://example.com/api/annotations/:id',
          },
          read: {},
          update: {
            method: 'PUT',
            url: 'http://example.com/api/annotations/:id',
          },
        },
        search: {
          method: 'GET',
          url: 'http://example.com/api/search',
        },
      },
    });
    $httpBackend.flush();
  }));

  it('saves a new annotation', function () {
    var done = store.annotation.create({}, {}).then(function (saved) {
      assert.isNotNull(saved.id);
    });

    $httpBackend.expectPOST('http://example.com/api/annotations')
      .respond(function () {
        return [201, {id: 'new-id'}, {}];
      });
    flushHttpRequests();

    return done;
  });

  it('updates an annotation', function () {
    var done = store.annotation.update({id: 'an-id'}, {text: 'updated'});

    $httpBackend.expectPUT('http://example.com/api/annotations/an-id')
      .respond(function () {
        return [200, {}, {}];
      });
    flushHttpRequests();

    return done;
  });

  it('deletes an annotation', function () {
    var done = store.annotation.delete({id: 'an-id'}, {});

    $httpBackend.expectDELETE('http://example.com/api/annotations/an-id')
      .respond(function () {
        return [200, {}, {}];
      });
    flushHttpRequests();

    return done;
  });

  it('removes internal properties before sending data to the server', function () {
    var annotation = {
      $highlight: true,
      $notme: 'nooooo!',
      allowed: 123,
    };
    var done = store.annotation.create({}, annotation);

    $httpBackend.expectPOST('http://example.com/api/annotations', {
      allowed: 123,
    })
      .respond(function () { return [200, {id: 'test'}, {}]; });
    flushHttpRequests();

    return done;
  });

  // Our backend service interprets semicolons as query param delimiters, so we
  // must ensure to encode them in the query string.
  it('encodes semicolons in query parameters', function () {
    var done = store.search({'uri': 'http://example.com/?foo=bar;baz=qux'});

    $httpBackend.expectGET('http://example.com/api/search?uri=http%3A%2F%2Fexample.com%2F%3Ffoo%3Dbar%3Bbaz%3Dqux')
      .respond(function () { return [200, {}, {}]; });
    flushHttpRequests();

    return done;
  });
});
