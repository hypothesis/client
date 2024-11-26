import { mount } from '@hypothesis/frontend-testing';

import ModalDialog from '../ModalDialog';

describe('ModalDialog', () => {
  const createComponent = props => {
    return mount(<ModalDialog open {...props} />, { connected: true });
  };

  context('when native modal dialog is not supported', () => {
    let fakeDocument;

    beforeEach(() => {
      fakeDocument = {
        createElement: sinon.stub().returns({}),
      };
    });

    it('does not render a dialog element', () => {
      const wrapper = createComponent({ document_: fakeDocument });
      assert.isFalse(wrapper.exists('dialog'));
    });
  });

  context('when native modal dialog is supported', () => {
    it('renders a dialog element', () => {
      const wrapper = createComponent();
      assert.isTrue(wrapper.exists('dialog'));
    });

    it('closes native dialog on cancel', () => {
      const onClose = sinon.stub();
      const wrapper = createComponent({ onClose });

      wrapper.find('dialog').getDOMNode().dispatchEvent(new Event('cancel'));
      wrapper.update();
      assert.called(onClose);
    });
  });
});
