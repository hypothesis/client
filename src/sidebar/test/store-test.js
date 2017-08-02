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

    var fakeAuth = {};

    angular.mock.module('h', {
      auth: fakeAuth,
      settings: {apiUrl: 'http://example.com/api/'},
    });

    angular.mock.inject(function (_$q_) {
      var $q = _$q_;
      fakeAuth.tokenGetter = function () {
        return $q.resolve('faketoken');
      };
    });
  });

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    sandbox.restore();
  });

  beforeEach(angular.mock.inject(function (_$httpBackend_, _store_) {
    $httpBackend = _$httpBackend_;
    store = _store_;

    $httpBackend.expectGET('http://example.com/api/').respond({
      // Return an API route directory.
      // This should mirror the structure (but not the exact URLs) of
      // https://hypothes.is/api/.
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
          flag: {
            method: 'PUT',
            url: 'http://example.com/api/annotations/:id/flag',
          },
          hide: {
            method: 'PUT',
            url: 'http://example.com/api/annotations/:id/hide',
          },
          unhide: {
            method: 'DELETE',
            url: 'http://example.com/api/annotations/:id/hide',
          },
        },
        search: {
          method: 'GET',
          url: 'http://example.com/api/search',
        },
        profile: {
          read: {
            method: 'GET',
            url: 'http://example.com/api/profile',
          },
          update: {
            method: 'PATCH',
            url: 'http://example.com/api/profile',
          },
        },
      },
    });
    $httpBackend.flush();
  }));

  it('saves a new annotation', function (done) {
    store.annotation.create({}, {}).then(function (saved) {
      assert.isNotNull(saved.id);
      done();
    });

    $httpBackend.expectPOST('http://example.com/api/annotations')
      .respond(function () {
        return [201, {id: 'new-id'}, {}];
      });
    $httpBackend.flush();
  });

  it('updates an annotation', function (done) {
    store.annotation.update({id: 'an-id'}, {text: 'updated'}).then(function () {
      done();
    });

    $httpBackend.expectPUT('http://example.com/api/annotations/an-id')
      .respond(function () {
        return [200, {}, {}];
      });
    $httpBackend.flush();
  });

  it('deletes an annotation', function (done) {
    store.annotation.delete({id: 'an-id'}, {}).then(function () {
      done();
    });

    $httpBackend.expectDELETE('http://example.com/api/annotations/an-id')
      .respond(function () {
        return [200, {}, {}];
      });
    $httpBackend.flush();
  });

  it('flags an annotation', function (done) {
    store.annotation.flag({id: 'an-id'}).then(function () {
      done();
    });

    $httpBackend.expectPUT('http://example.com/api/annotations/an-id/flag')
      .respond(function () {
        return [204, {}, {}];
      });
    $httpBackend.flush();
  });

  it('hides an annotation', function (done) {
    store.annotation.hide({id: 'an-id'}).then(function () {
      done();
    });

    $httpBackend.expectPUT('http://example.com/api/annotations/an-id/hide')
      .respond(function () {
        return [204, {}, {}];
      });
    $httpBackend.flush();
  });

  it('unhides an annotation', function (done) {
    store.annotation.unhide({id: 'an-id'}).then(function () {
      done();
    });

    $httpBackend.expectDELETE('http://example.com/api/annotations/an-id/hide')
      .respond(function () {
        return [204, {}, {}];
      });
    $httpBackend.flush();
  });

  it('removes internal properties before sending data to the server', function (done) {
    var annotation = {
      $highlight: true,
      $notme: 'nooooo!',
      allowed: 123,
    };
    store.annotation.create({}, annotation).then(function () {
      done();
    });

    $httpBackend.expectPOST('http://example.com/api/annotations', {
      allowed: 123,
    })
      .respond(function () { return [200, {id: 'test'}, {}]; });
    $httpBackend.flush();
  });

  // Our backend service interprets semicolons as query param delimiters, so we
  // must ensure to encode them in the query string.
  it('encodes semicolons in query parameters', function (done) {
    store.search({'uri': 'http://example.com/?foo=bar;baz=qux'}).then(function () {
      done();
    });

    $httpBackend.expectGET('http://example.com/api/search?uri=http%3A%2F%2Fexample.com%2F%3Ffoo%3Dbar%3Bbaz%3Dqux')
      .respond(function () { return [200, {}, {}]; });
    $httpBackend.flush();
  });

  it("fetches the user's profile", function (done) {
    var profile = {userid: 'acct:user@publisher.org'};
    store.profile.read({authority: 'publisher.org'}).then(function (profile_) {
      assert.deepEqual(profile_, profile);
      done();
    });
    $httpBackend.expectGET('http://example.com/api/profile?authority=publisher.org')
      .respond(function () { return [200, profile, {}]; });
    $httpBackend.flush();
  });

  it("updates a user's profile", function (done) {
    store.profile.update({}, {preferences: {}}).then(function () {
      done();
    });

    $httpBackend.expectPATCH('http://example.com/api/profile')
      .respond(function () {
        return [200, {}, {}];
      });
    $httpBackend.flush();
  });

  context('when an API calls fail', function () {
    util.unroll('rejects the call with an Error', function (done, testCase) {
      store.profile.update({}, {preferences: {}}).catch(function (err) {
        assert(err instanceof Error);
        assert.equal(err.message, testCase.expectedMessage);
        done();
      });
      $httpBackend.expectPATCH('http://example.com/api/profile')
      .respond(function () {
        return [testCase.status, testCase.body, {}, testCase.statusText];
      });
      $httpBackend.flush();
    }, [{
      // Network error
      status: -1,
      body: null,
      expectedMessage: 'Service unreachable.',
    },{
      // Request failed with an error given in the JSON body
      status: 404,
      statusText: 'Not found',
      body: {
        reason: 'Thing not found',
      },
      expectedMessage: '404 Not found: Thing not found',
    },{
      // Request failed with a non-JSON response
      status: 500,
      statusText: 'Server Error',
      body: 'Internal Server Error',
      expectedMessage: '500 Server Error',
    }]);

    it("exposes details in the Error's `response` property", function (done) {
      store.profile.update({}, {preferences: {}}).catch(function (err) {
        assert.match(err.response, sinon.match({
          status: 404,
          statusText: 'Not found',
          data: {
            reason: 'User not found',
          },
        }));
        done();
      });
      $httpBackend.expectPATCH('http://example.com/api/profile')
      .respond(function () {
        return [404, { reason: 'User not found' }, {}, 'Not found'];
      });
      $httpBackend.flush();
    });
  });
});
