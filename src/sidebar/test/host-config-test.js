'use strict';

const hostPageConfig = require('../host-config');

function fakeWindow(config) {
  return {
    location: {
      search: '?config=' + JSON.stringify(config),
    },
  };
}

describe('hostPageConfig', function() {
  it('parses config from location string and returns whitelisted params', function() {
    const window_ = fakeWindow({
      annotations: '1234',
      group: 'abc12',
      appType: 'bookmarklet',
      openSidebar: true,
      requestConfigFromFrame: 'https://embedder.com',
      showHighlights: true,
      services: [
        {
          authority: 'hypothes.is',
        },
      ],
    });

    assert.deepEqual(hostPageConfig(window_), {
      annotations: '1234',
      group: 'abc12',
      appType: 'bookmarklet',
      openSidebar: true,
      requestConfigFromFrame: 'https://embedder.com',
      showHighlights: true,
      services: [
        {
          authority: 'hypothes.is',
        },
      ],
    });
  });

  it('ignores non-whitelisted config params', function() {
    const window_ = fakeWindow({
      apiUrl: 'https://not-the-hypothesis/api/',
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });

  it('ignores `null` values in config', function() {
    const window_ = fakeWindow({
      openSidebar: null,
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });
});
