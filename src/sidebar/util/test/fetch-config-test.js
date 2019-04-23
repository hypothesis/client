'use strict';

const {
  assertPromiseIsRejected,
} = require('../../../shared/test/promise-util');

const { fetchConfig, $imports } = require('../fetch-config');

describe('sidebar.util.fetch-config', () => {
  let fakeHostConfig;
  let fakeJsonRpc;
  let fakeWindow;

  beforeEach(() => {
    fakeHostConfig = sinon.stub();
    fakeJsonRpc = {
      call: sinon.stub(),
    };
    $imports.$mock({
      '../host-config': fakeHostConfig,
      './postmessage-json-rpc': fakeJsonRpc,
    });

    // By default, embedder provides no custom config.
    fakeHostConfig.returns({});

    // By default, fetching config from parent frames fails.
    fakeJsonRpc.call.throws(new Error('call() response not set'));

    // Setup fake window hierarchy.
    const fakeTopWindow = { parent: null, top: null };
    fakeTopWindow.parent = fakeTopWindow; // Yep, the DOM really works like this.
    fakeTopWindow.top = fakeTopWindow;

    const fakeParent = { parent: fakeTopWindow, top: fakeTopWindow };

    fakeWindow = { parent: fakeParent, top: fakeTopWindow };
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('fetchConfig', () => {
    // By default, combine the settings rendered into the sidebar's HTML page
    // by h with the settings from `window.hypothesisConfig` in the parent
    // window.
    it('reads config from sidebar URL query string', () => {
      fakeHostConfig
        .withArgs(fakeWindow)
        .returns({ apiUrl: 'https://dev.hypothes.is/api/' });

      return fetchConfig({}, fakeWindow).then(config => {
        assert.deepEqual(config, { apiUrl: 'https://dev.hypothes.is/api/' });
      });
    });

    it('merges config from sidebar HTML app and embedder', () => {
      const apiUrl = 'https://dev.hypothes.is/api/';
      fakeHostConfig.returns({
        appType: 'via',
      });

      return fetchConfig({ apiUrl }, fakeWindow).then(config => {
        assert.deepEqual(config, { apiUrl, appType: 'via' });
      });
    });

    // By default, don't try to fetch settings from parent frames via
    // `postMessage` requests.
    it('does not fetch settings from ancestor frames by default', () => {
      return fetchConfig({}, fakeWindow).then(() => {
        assert.notCalled(fakeJsonRpc.call);
      });
    });

    // In scenarios like LMS integrations, the client is annotating a document
    // inside an iframe and the client needs to retrieve configuration securely
    // from the top-level window without that configuration being exposed to the
    // document itself.
    //
    // This config fetching is enabled by a setting in the host page.
    context('when fetching config from an ancestor frame is enabled', () => {
      const expectedTimeout = 3000;

      beforeEach(() => {
        fakeHostConfig.returns({
          requestConfigFromFrame: 'https://embedder.com',
        });
        sinon.stub(console, 'warn');
      });

      afterEach(() => {
        console.warn.restore();
      });

      it('fetches config from ancestor frames', () => {
        fakeJsonRpc.call.returns(Promise.resolve({}));

        return fetchConfig({}, fakeWindow).then(() => {
          // The client will send a message to each ancestor asking for
          // configuration. Only those with the expected origin will be able to
          // respond.
          const ancestors = [fakeWindow.parent, fakeWindow.parent.parent];
          ancestors.forEach(frame => {
            assert.calledWith(
              fakeJsonRpc.call,
              frame,
              'https://embedder.com',
              'requestConfig',
              expectedTimeout
            );
          });
        });
      });

      it('rejects if sidebar is top frame', () => {
        fakeWindow.parent = fakeWindow;
        fakeWindow.top = fakeWindow;

        const config = fetchConfig({}, fakeWindow);
        return assertPromiseIsRejected(config, 'Client is top frame');
      });

      it('rejects if fetching config fails', () => {
        fakeJsonRpc.call.returns(Promise.reject(new Error('Nope')));
        const config = fetchConfig({}, fakeWindow);
        return assertPromiseIsRejected(config, 'Nope');
      });

      it('returns config from ancestor frame', () => {
        // When the embedder responds with configuration, that should be
        // returned by `fetchConfig`.
        fakeJsonRpc.call.returns(new Promise(() => {}));
        fakeJsonRpc.call
          .withArgs(
            fakeWindow.parent.parent,
            'https://embedder.com',
            'requestConfig',
            expectedTimeout
          )
          .returns(
            Promise.resolve({
              // Here the embedder's parent returns service configuration
              // (aka. credentials for automatic login).
              services: [
                {
                  apiUrl: 'https://servi.ce/api/',
                  grantToken: 'secret-token',
                },
              ],
            })
          );

        return fetchConfig({}, fakeWindow).then(config => {
          assert.deepEqual(config, {
            apiUrl: 'https://servi.ce/api/',
            services: [
              {
                apiUrl: 'https://servi.ce/api/',
                grantToken: 'secret-token',
              },
            ],
          });
        });
      });
    });
  });
});
