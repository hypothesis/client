'use strict';

var hostPageConfig = require('../host-config');

function fakeWindow(config) {
  return {
    location: {
      search: '?config=' + JSON.stringify(config),
    },
  };
}

describe('hostPageConfig', function () {
  it('parses config from location string and returns whitelisted params', function () {
    var window_ = fakeWindow({
      annotations: '1234',
      appType: 'bookmarklet',
      oauthEnabled: true,
      openSidebar: true,
      openLoginForm: true,
      showHighlights: true,
      services: [{
        authority: 'hypothes.is',
      }],
    });

    assert.deepEqual(hostPageConfig(window_), {
      annotations: '1234',
      appType: 'bookmarklet',
      oauthEnabled: true,
      openSidebar: true,
      openLoginForm: true,
      showHighlights: true,
      services: [{
        authority: 'hypothes.is',
      }],
    });
  });

  it('ignores non-whitelisted config params', function () {
    var window_ = fakeWindow({
      apiUrl: 'https://not-the-hypothesis/api',
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });

  it('ignores `null` values in config', function () {
    var window_ = fakeWindow({
      oauthEnabled: null,
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });
});
