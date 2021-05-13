import { mount } from 'enzyme';

import Panel from '../Panel';
import { $imports } from '../Panel';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('Panel', () => {
  const createPanel = props =>
    mount(
      <Panel title="Test Panel" {...props}>
        Test panel
      </Panel>
    );

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders the provided title', () => {
    const wrapper = createPanel({ title: 'My Panel' });
    const titleEl = wrapper.find('.client-Panel__title');
    assert.equal(titleEl.text(), 'My Panel');
  });

  it('renders an icon if provided', () => {
    const wrapper = createPanel({ icon: 'restricted' });

    const icon = wrapper.find('SvgIcon').filter({ name: 'restricted' });

    assert.isTrue(icon.exists());
  });

  context('when `onClose` is provided', () => {
    it('renders a close button', () => {
      const wrapper = createPanel({
        onClose: sinon.stub(),
      });

      const closeButton = wrapper.find('LabeledButton');
      assert.isTrue(closeButton.exists());
      assert.equal(closeButton.props().title, 'Close');
    });

    it('invokes `onClose` handler when close button is clicked', () => {
      const onClose = sinon.stub();
      const wrapper = createPanel({
        onClose,
      });

      wrapper.find('LabeledButton').props().onClick();

      assert.calledOnce(onClose);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createPanel(),
    })
  );
});
