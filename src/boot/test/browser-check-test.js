import { isBrowserSupported } from '../browser-check';

describe('isBrowserSupported', () => {
  it('returns true in a modern browser', () => {
    assert.isTrue(isBrowserSupported());
  });

  // nb. This doesn't exhaustively test each feature check we use, just a few
  // representative cases.
  [
    // Make certain checks return falsey values.
    {
      patch: () => (document.evaluate = null),
      restore: () => {
        delete document.evaluate;
      },
    },
    {
      patch: () => sinon.stub(CSS, 'supports').returns(false),
      restore: () => CSS.supports.restore(),
    },

    // Make certain checks throw an error.
    {
      patch: () =>
        sinon.stub(CSS, 'supports').throws(new Error('Wrong arguments')),
      restore: () => CSS.supports.restore(),
    },
  ].forEach(({ patch, restore }) => {
    it('returns false if a check fails', () => {
      patch();
      try {
        assert.isFalse(isBrowserSupported());
      } finally {
        restore();
      }
    });
  });
});
