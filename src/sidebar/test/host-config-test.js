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
      openSidebar: true,
      showHighlights: true,
      services: [{
        authority: 'hypothes.is',
      }],
      onElementClick : false,
      isHighlightBtnVisible: false,
    });

    assert.deepEqual(hostPageConfig(window_), {
      annotations: '1234',
      appType: 'bookmarklet',
      openSidebar: true,
      showHighlights: true,
      services: [{
        authority: 'hypothes.is',
      }],
      onElementClick : false,
      isHighlightBtnVisible: false,
    });
  });

  it('ignores non-whitelisted config params', function () {
    var window_ = fakeWindow({
      apiUrl: 'https://not-the-hypothesis/api/',
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });

  it('ignores `null` values in config', function () {
    var window_ = fakeWindow({
      openSidebar: null,
      onElementClick : null,
      isHighlightBtnVisible: null,
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });
});
