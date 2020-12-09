import { copyText } from '../copy-to-clipboard';
describe('copy-to-clipboard', () => {
  let clipboardBackup = navigator.clipboard;

  function setClipboard(customClipboard) {
    Object.defineProperty(navigator, 'clipboard', {
      get: function () {
        return customClipboard;
      },
      configurable: true,
    });
  }

  describe('copyText (modern)', () => {
    let fakeWriteText = sinon.stub();

    beforeEach(() => {
      setClipboard({ writeText: fakeWriteText });
    });

    afterEach(() => {
      setClipboard(clipboardBackup);
    });

    it('copies text via clipboard API', async () => {
      const text = 'test string';
      await copyText(text);
      assert.called(fakeWriteText);
    });
  });

  describe('copyText (legacy)', () => {
    /**
     * Returns the temporary element used to hold text being copied.
     */
    function tempSpan() {
      return document.querySelector('[data-testid=copy-text]');
    }

    beforeEach(() => {
      setClipboard(undefined);
      sinon.stub(document, 'execCommand');

      // Make no hidden element created for copying text has been left over
      // from a previous test.
      assert.isNull(tempSpan());

      // Make sure there is nothing already selected to copy.
      window.getSelection().removeAllRanges();
    });

    afterEach(() => {
      setClipboard(clipboardBackup);
      document.execCommand.restore();
    });

    it('copies the passed text to the clipboard (legacy)', async () => {
      // We can't actually copy to the clipboard due to security restrictions,
      // but we can verify that `execCommand("copy")` was called and that the
      // passed text was selected at the time.
      document.execCommand.callsFake(() => {
        assert.equal(document.getSelection().toString(), 'test string');
      });
      await copyText('test string');
      assert.calledWith(document.execCommand, 'copy');
      assert.isNull(tempSpan());
    });

    it('removes temporary input if copying fails', async () => {
      document.execCommand.callsFake(() => {
        assert.ok(tempSpan());
        throw new Error('No clipboard access for you!');
      });
      try {
        await copyText('fibble-wobble');
      } catch (e) {
        assert.equal(e.message, 'No clipboard access for you!');
      }
      assert.isNull(tempSpan());
    });
  });
});
