'use strict';

const { copyText } = require('../copy-to-clipboard');

describe('copy-to-clipboard', () => {
  beforeEach(() => {
    sinon.stub(document, 'execCommand');
  });

  afterEach(() => {
    document.execCommand.restore();
  });

  describe('copyText', () => {
    /**
     * Returns the temporary element used to hold text being copied.
     */
    function tempSpan() {
      return document.querySelector('.copy-text');
    }

    it('copies the passed text to the clipboard', () => {
      // We can't actually copy to the clipboard due to security restrictions,
      // but we can verify that `execCommand("copy")` was called and that the
      // passed text was selected at the time.
      const testStr = `test string ${Math.random()}`;
      document.execCommand.callsFake(() => {
        assert.equal(document.getSelection().toString(), testStr);
      });
      copyText(testStr);
      assert.calledWith(document.execCommand, 'copy');
      assert.isNull(tempSpan());
    });

    it('removes temporary span if copying fails', () => {
      document.execCommand.callsFake(() => {
        assert.ok(tempSpan());
        throw new Error('No clipboard access for you!');
      });
      try {
        copyText('fibble-wobble');
      } catch (e) {
        assert.equal(e.message, 'No clipboard access for you!');
      }
      assert.isNull(tempSpan());
    });
  });
});
