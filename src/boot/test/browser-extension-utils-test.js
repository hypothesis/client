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
    let fakeDocument;

    beforeEach(() => {
      fakeDocument = {
        querySelector: sinon.stub(),
      };
    });

    [
      { element: null, configExists: false },
      { element: {}, configExists: true },
    ].forEach(({ element, configExists }) => {
      it('returns proper result if the config script was found', () => {
        fakeDocument.querySelector.returns(element);

        assert.equal(
          hasExtensionConfig('hypothesisId', fakeDocument),
          configExists
        );
        assert.calledWith(
          fakeDocument.querySelector,
          sinon.match('hypothesisId')
        );
      });
    });
  });
});
