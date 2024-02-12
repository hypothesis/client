import { mount } from 'enzyme';

import ModalDialog from '../ModalDialog';

describe('ModalDialog', () => {
  let components;

  const createComponent = props => {
    const attachTo = document.createElement('div');
    document.body.appendChild(attachTo);

    const component = mount(<ModalDialog open {...props} />, {
      attachTo,
    });
    components.push([component, attachTo]);
    return component;
  };

  beforeEach(() => {
    components = [];
  });

  afterEach(() => {
    components.forEach(([component, container]) => {
      component.unmount();
      container.remove();
    });
  });

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
