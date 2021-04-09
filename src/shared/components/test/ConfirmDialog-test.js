import { mount } from 'enzyme';

import mockImportedComponents from '../../../test-util/mock-imported-components';

import ConfirmDialog, { $imports } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders dialog', () => {
    const confirm = sinon.stub();
    const cancel = sinon.stub();

    const wrapper = mount(
      <ConfirmDialog
        title="Delete annotation?"
        message="Do you want to delete this annotation?"
        confirmAction="Do it!"
        onConfirm={confirm}
        onCancel={cancel}
      />
    );

    const dialog = wrapper.find('Dialog');
    assert.equal(dialog.prop('title'), 'Delete annotation?');
    assert.equal(
      dialog.children().text(),
      'Do you want to delete this annotation?'
    );
    assert.equal(dialog.prop('onCancel'), cancel);
    assert.equal(mount(dialog.prop('buttons')[0]).prop('onClick'), confirm);
  });
});
