import { getExtensionId, hasExtensionConfig } from '../browser-extension-utils';

describe('browser-extension-utils', () => {
  describe('getExtensionId', () => {
    [
      { window: {}, expectedId: undefined },
      {
        window: {
          chrome: {},
        },
        expectedId: undefined,
      },
      {
        window: {
          chrome: {
            runtime: {},
          },
        },
        expectedId: undefined,
      },
      {
        window: {
          chrome: {
            runtime: { id: 'hypothesisId' },
          },
        },
        expectedId: 'hypothesisId',
      },
    ].forEach(({ window, expectedId }) => {
      it('returns the extension ID only when running in the scope of a browser extension', () => {
        assert.equal(getExtensionId(window), expectedId);
      });
    });
  });

  describe('hasExtensionConfig', () => {
    afterEach(() => {
      const script = document.querySelector('.js-hypothesis-config-test');
      script?.remove();
    });

    [false, true].forEach(configExists => {
      it('returns proper result if the config script was found', () => {
        if (configExists) {
          const configScript = document.createElement('script');
          configScript.className =
            'js-hypothesis-config js-hypothesis-config-test';
          configScript.setAttribute('data-extension-id', 'hypothesisId');
          configScript.type = 'application/json';
          configScript.innerText = '{}';
          document.body.append(configScript);
        }

        assert.equal(hasExtensionConfig('hypothesisId'), configExists);
      });
    });
  });
});
