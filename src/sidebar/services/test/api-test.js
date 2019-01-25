'use strict';

const angular = require('angular');
const proxyquire = require('proxyquire');

const util = require('../../../shared/test/util');

// API route directory.
//
// This should mirror https://hypothes.is/api/. The domain name has been changed
// to guard against hardcoding of "hypothes.is".
//
// This can be updated by running:
//
// `curl https://hypothes.is/api/ | sed 's/hypothes.is/example.com/g' | jq . > api-index.json`
//
const routes = require('./api-index.json').links;

describe('sidebar.services.api', function () {
  let $httpBackend = null;
  let sandbox = null;
  let api = null;

  before(function () {
    angular.module('h', [])
      .service('api', proxyquire('../api', util.noCallThru({
        angular: angular,
        '../retry-util': {
          retryPromiseOperation: function (fn) {
            return fn();
          },
        },
      })));
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    const fakeApiRoutes = {
      links: sinon.stub(),
      routes: sinon.stub(),
    };
    const fakeAuth = {};

    angular.mock.module('h', {
      apiRoutes: fakeApiRoutes,
      auth: fakeAuth,
      settings: {apiUrl: 'https://example.com/api/'},
    });

    angular.mock.inject(function (_$q_) {
      const $q = _$q_;
      fakeAuth.tokenGetter = function () {
        return $q.resolve('faketoken');
      };

      fakeApiRoutes.routes.returns($q.resolve(routes));
    });
  });

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    sandbox.restore();
  });

  beforeEach(angular.mock.inject(function (_$httpBackend_, _api_) {
    $httpBackend = _$httpBackend_;
    api = _api_;
  }));

  it('saves a new annotation', function (done) {
    api.annotation.create({}, {}).then(function (saved) {
      assert.isNotNull(saved.id);
      done();
    });

    $httpBackend.expectPOST('https://example.com/api/annotations')
      .respond(function () {
        return [201, {id: 'new-id'}, {}];
      });
    $httpBackend.flush();
  });

  it('updates an annotation', function (done) {
    api.annotation.update({id: 'an-id'}, {text: 'updated'}).then(function () {
      done();
    });

    $httpBackend.expectPATCH('https://example.com/api/annotations/an-id')
      .respond(function () {
        return [200, {}, {}];
      });
    $httpBackend.flush();
  });

  it('deletes an annotation', function (done) {
    api.annotation.delete({id: 'an-id'}, {}).then(function () {
      done();
    });

    $httpBackend.expectDELETE('https://example.com/api/annotations/an-id')
      .respond(function () {
        return [200, {}, {}];
      });
    $httpBackend.flush();
  });

  it('flags an annotation', function (done) {
    api.annotation.flag({id: 'an-id'}).then(function () {
      done();
    });

    $httpBackend.expectPUT('https://example.com/api/annotations/an-id/flag')
      .respond(function () {
        return [204, {}, {}];
      });
    $httpBackend.flush();
  });

  it('hides an annotation', function (done) {
    api.annotation.hide({id: 'an-id'}).then(function () {
      done();
    });

    $httpBackend.expectPUT('https://example.com/api/annotations/an-id/hide')
      .respond(function () {
        return [204, {}, {}];
      });
    $httpBackend.flush();
  });

  it('unhides an annotation', function (done) {
    api.annotation.unhide({id: 'an-id'}).then(function () {
      done();
    });

    $httpBackend.expectDELETE('https://example.com/api/annotations/an-id/hide')
      .respond(function () {
        return [204, {}, {}];
      });
    $httpBackend.flush();
  });

  describe('#group.member.delete', () => {
    it('removes current user from a group', (done) => {
      api.group.member.delete({pubid: 'an-id', userid: 'me'}).then(function () {
        done();
      });

      $httpBackend.expectDELETE('https://example.com/api/groups/an-id/members/me')
        .respond(() => {
          return [204, {}, {}];
        });
      $httpBackend.flush();
    });
  });

  it('removes internal properties before sending data to the server', function (done) {
    const annotation = {
      $highlight: true,
      $notme: 'nooooo!',
      allowed: 123,
    };
    api.annotation.create({}, annotation).then(function () {
      done();
    });

    $httpBackend.expectPOST('https://example.com/api/annotations', {
      allowed: 123,
    })
      .respond(function () { return [200, {id: 'test'}, {}]; });
    $httpBackend.flush();
  });

  // Our backend service interprets semicolons as query param delimiters, so we
  // must ensure to encode them in the query string.
  it('encodes semicolons in query parameters', function (done) {
    api.search({'uri': 'http://foobar.com/?foo=bar;baz=qux'}).then(function () {
      done();
    });

    $httpBackend.expectGET('https://example.com/api/search?uri=http%3A%2F%2Ffoobar.com%2F%3Ffoo%3Dbar%3Bbaz%3Dqux')
      .respond(function () { return [200, {}, {}]; });
    $httpBackend.flush();
  });

  it("fetches the user's profile", function (done) {
    const profile = {userid: 'acct:user@publisher.org'};
    api.profile.read({authority: 'publisher.org'}).then(function (profile_) {
      assert.deepEqual(profile_, profile);
      done();
    });
    $httpBackend.expectGET('https://example.com/api/profile?authority=publisher.org')
      .respond(function () { return [200, profile, {}]; });
    $httpBackend.flush();
  });

  it("updates a user's profile", function (done) {
    api.profile.update({}, {preferences: {}}).then(function () {
      done();
    });

    $httpBackend.expectPATCH('https://example.com/api/profile')
      .respond(function () {
        return [200, {}, {}];
      });
    $httpBackend.flush();
  });

  context('when an API calls fail', function () {
    util.unroll('rejects the call with an Error', function (done, testCase) {
      api.profile.update({}, {preferences: {}}).catch(function (err) {
        assert(err instanceof Error);
        assert.equal(err.message, testCase.expectedMessage);
        done();
      });
      $httpBackend.expectPATCH('https://example.com/api/profile')
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
      api.profile.update({}, {preferences: {}}).catch(function (err) {
        assert.match(err.response, sinon.match({
          status: 404,
          statusText: 'Not found',
          data: {
            reason: 'User not found',
          },
        }));
        done();
      });
      $httpBackend.expectPATCH('https://example.com/api/profile')
        .respond(function () {
          return [404, { reason: 'User not found' }, {}, 'Not found'];
        });
      $httpBackend.flush();
    });
  });

  it('API calls return just the JSON response if `includeMetadata` is false', () => {
    api.profile.read({}).then(response => {
      assert.match(response, sinon.match({
        userid: 'acct:user@example.com',
      }));
    });

    $httpBackend.expectGET('https://example.com/api/profile')
      .respond(() => [200, { userid: 'acct:user@example.com' }]);
    $httpBackend.flush();
  });

  it('API calls return an `APIResponse` if `includeMetadata` is true', () => {
    api.profile.read({}, null, { includeMetadata: true }).then(response => {
      assert.match(response, sinon.match({
        data: {
          userid: 'acct:user@example.com',
        },
        token: 'faketoken',
      }));
    });

    $httpBackend.expectGET('https://example.com/api/profile')
      .respond(() => [200, { userid: 'acct:user@example.com' }]);
    $httpBackend.flush();
  });
});
