import { copyPlainText, copyHTML, copyText } from '../copy-to-clipboard';

describe('copy-to-clipboard', () => {
  const createFakeNavigator = clipboard => ({ clipboard });

  describe('copyText', () => {
    beforeEach(() => {
      sinon.stub(document, 'execCommand');
    });

    afterEach(() => {
      document.execCommand.restore();
    });

    /**
     * Returns the temporary element used to hold text being copied.
     */
    function tempSpan() {
      return document.querySelector('[data-testid=copy-text]');
    }

    beforeEach(() => {
      // Make no hidden element created for copying text has been left over
      // from a previous test.
      assert.isNull(tempSpan());

      // Make sure there is nothing already selected to copy.
      window.getSelection().removeAllRanges();
    });

    it('copies the passed text to the clipboard', () => {
      // We can't actually copy to the clipboard due to security restrictions,
      // but we can verify that `execCommand("copy")` was called and that the
      // passed text was selected at the time.
      document.execCommand.callsFake(() => {
        assert.equal(document.getSelection().toString(), 'test string');
      });
      copyText('test string');
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

  describe('copyPlainText', () => {
    it('writes provided text to clipboard', async () => {
      const text = 'Lorem ipsum dolor sit amet';
      const writeText = sinon.stub();

      await copyPlainText(text, createFakeNavigator({ writeText }));

      assert.calledWith(writeText, text);
    });
  });

  describe('copyHTML', () => {
    it('writes provided text to clipboard', async () => {
      const text = 'Lorem ipsum dolor sit amet';
      const write = sinon.stub();

      await copyHTML(text, createFakeNavigator({ write }));

      assert.called(write);
    });

    it('falls back to execCommand if clipboard API is not supported', async () => {
      const text = 'Lorem ipsum dolor sit amet';
      const clipboardData = new DataTransfer();
      const document = Object.assign(new EventTarget(), {
        execCommand: sinon.stub().callsFake(command => {
          if (command === 'copy') {
            document.dispatchEvent(
              new ClipboardEvent('copy', { clipboardData }),
            );
          }
        }),
      });

      await copyHTML(text, createFakeNavigator({}), document);

      assert.calledWith(document.execCommand, 'copy');
      assert.equal(clipboardData.getData('text/html'), text);
    });
  });
});
