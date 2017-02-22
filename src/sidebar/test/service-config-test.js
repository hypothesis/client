'use strict';

var serviceConfig = require('../service-config');

describe('serviceConfig', function () {
  it('returns null if services is not an array', function () {
    var settings = {
      services: 'someString',
    };

    assert.isNull(serviceConfig(settings));
  });

  it('returns null if the settings object has no services', function () {
    var settings = {
      services: [],
    };

    assert.isNull(serviceConfig(settings));
  });

  it('returns the first service in the settings object', function () {
    var settings = {
      services: [{
        key: 'val',
      }],
    };

    assert.deepEqual(settings.services[0], serviceConfig(settings));
  });
});
