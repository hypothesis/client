import { OutsideAssignmentNoticeController } from '../outside-assignment-notice';

describe('OutsideAssignmentNoticeController', () => {
  function getNotice(container) {
    return container
      .querySelector('hypothesis-notice')
      ?.shadowRoot.querySelector('[data-testid="outside-assignment-notice"]');
  }

  it('shows notice when `setVisible(true)` is called', () => {
    const container = document.createElement('div');
    const controller = new OutsideAssignmentNoticeController(container);

    assert.notOk(getNotice(container));

    controller.setVisible(true);
    assert.ok(getNotice(container));

    controller.setVisible(false);
    assert.notOk(getNotice(container));
  });

  it('removes notice when `destroy` is called', () => {
    const container = document.createElement('div');
    const controller = new OutsideAssignmentNoticeController(container);

    controller.setVisible(true);
    assert.ok(getNotice(container));

    controller.destroy();
    assert.notOk(getNotice(container));
  });
});
