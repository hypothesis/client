import { confirm, $imports } from '../prompts';

function FakeConfirmDialog({
  confirmAction,
  message,
  onCancel,
  onConfirm,
  title,
}) {
  return (
    <div>
      <h1>{title}</h1>
      <p>{message}</p>
      <button data-testid="confirm" onClick={onConfirm}>
        {confirmAction}
      </button>
      <button data-testid="cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

describe('shared/prompts', () => {
  describe('confirm', () => {
    beforeEach(() => {
      sinon.stub(window, 'confirm').returns(false);

      $imports.$mock({
        './components/ConfirmDialog': FakeConfirmDialog,
      });
    });

    afterEach(() => {
      window.confirm.restore();
    });

    function getCustomDialog() {
      return document.querySelector('[data-testid="confirm-container"]');
    }

    function clickConfirm() {
      const confirmButton = getCustomDialog().querySelector(
        '[data-testid="confirm"]'
      );
      confirmButton.click();
    }

    function clickCancel() {
      const cancelButton = getCustomDialog().querySelector(
        '[data-testid="cancel"]'
      );
      cancelButton.click();
    }

    it('uses `window.confirm` if available', async () => {
      window.confirm.returns(true);
      const result = await confirm({ message: 'Do the thing?' });
      assert.equal(result, true);
    });

    it('renders a custom dialog if `window.confirm` is not available', async () => {
      const result = confirm({
        title: 'Confirm action?',
        message: 'Do the thing?',
        confirmAction: 'Yeah!',
      });
      const dialog = getCustomDialog();

      assert.ok(dialog);
      assert.equal(dialog.querySelector('h1').textContent, 'Confirm action?');
      assert.equal(dialog.querySelector('p').textContent, 'Do the thing?');
      assert.equal(
        dialog.querySelector('[data-testid=confirm]').textContent,
        'Yeah!'
      );

      clickConfirm();
      await result;

      assert.notOk(getCustomDialog());
    });

    it('returns true if "Confirm" button is clicked', async () => {
      const result = confirm({ message: 'Do the thing?' });
      clickConfirm();
      assert.isTrue(await result);
    });

    it('returns false if "Cancel" button is clicked', async () => {
      const result = confirm({ message: 'Do the thing?' });
      clickCancel();
      assert.isFalse(await result);
    });
  });
});
