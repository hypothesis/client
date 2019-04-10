'use strict';

const serviceConfig = require('../service-config');

describe('serviceConfig', function() {
  it('returns null if services is not an array', function() {
    const settings = {
      services: 'someString',
    };

    assert.isNull(serviceConfig(settings));
  });

  it('returns null if the settings object has no services', function() {
    const settings = {
      services: [],
    };

    assert.isNull(serviceConfig(settings));
  });

  it('returns the first service in the settings object', function() {
    const settings = {
      services: [
        {
          key: 'val',
        },
      ],
    };

    assert.deepEqual(settings.services[0], serviceConfig(settings));
  });
});
