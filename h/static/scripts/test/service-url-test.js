'use strict';

var serviceUrl = require('../service-url');

describe('serviceUrl', function () {
  var service;

  beforeEach(function () {
    service = serviceUrl({serviceUrl: 'https://test.hypothes.is/'});
  });

  it('returns route URLs', function () {
    assert.equal(service('help'), 'https://test.hypothes.is/docs/help');
  });

  it('expands route parameters', function () {
    assert.equal(service('user', {user: 'jim'}),
      'https://test.hypothes.is/u/jim');
  });
});
