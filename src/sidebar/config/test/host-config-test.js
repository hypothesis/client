import hostPageConfig from '../host-config';

function fakeWindow(config) {
  return {
    location: {
      hash: '#config=' + JSON.stringify(config),
    },
  };
}

describe('sidebar/config/host-config', function () {
  it('parses config from location string and returns whitelisted params', function () {
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

  it('coerces `requestConfigFromFrame` and `openSidebar` values', function () {
    const window_ = fakeWindow({
      openSidebar: 'false',
      requestConfigFromFrame: {
        origin: 'origin',
        ancestorLevel: '2',
      },
    });

    assert.deepEqual(hostPageConfig(window_), {
      openSidebar: false,
      requestConfigFromFrame: {
        origin: 'origin',
        ancestorLevel: 2,
      },
    });
  });

  it('ignores non-whitelisted config params', function () {
    const window_ = fakeWindow({
      apiUrl: 'https://not-the-hypothesis/api/',
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });

  it('ignores `null` values in config', function () {
    const window_ = fakeWindow({
      openSidebar: null,
    });

    assert.deepEqual(hostPageConfig(window_), {});
  });
});
