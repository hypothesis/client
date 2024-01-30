import { copyPlainText, copyHTML } from '../copy-to-clipboard';

describe('copy-to-clipboard', () => {
  const createFakeNavigator = clipboard => ({ clipboard });

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

      assert.calledOnce(write);

      const [clipboardItem] = write.lastCall.args[0];
      const getTextForType = async type => {
        const blob = await clipboardItem.getType(type);
        return blob.text();
      };

      assert.deepEqual(clipboardItem.types, ['text/html', 'text/plain']);
      assert.equal(await getTextForType('text/html'), text);
      assert.equal(await getTextForType('text/plain'), text);
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
      assert.equal(clipboardData.getData('text/plain'), text);
    });
  });
});
