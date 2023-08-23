import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import FileInput from '../FileInput';

describe('FileInput', () => {
  let container;
  let fakeOnFileSelected;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    fakeOnFileSelected = sinon.stub();
  });

  afterEach(() => {
    container.remove();
  });

  const createFile = name => new File([name], `${name}.json`);

  const fillInputWithFiles = (fileInput, files) => {
    const list = new DataTransfer();

    files.forEach(file => list.items.add(file));
    fileInput.getDOMNode().files = list.files;
  };

  const getActualFileInput = wrapper =>
    wrapper.find('[data-testid="file-input"]');
  const getProxyInput = wrapper =>
    wrapper.find('input[data-testid="file-input-proxy-input"]');
  const getProxyButton = wrapper =>
    wrapper.find('button[data-testid="file-input-proxy-button"]');

  const createInput = (disabled = undefined) => {
    const wrapper = mount(
      <FileInput onFileSelected={fakeOnFileSelected} disabled={disabled} />,
      { attachTo: container },
    );

    // Stub "click" method on the native input, so it doesn't show a real file
    // dialog
    sinon.stub(getActualFileInput(wrapper).getDOMNode(), 'click');

    return wrapper;
  };

  it('calls onFileSelected when selected file changes', () => {
    const wrapper = createInput();
    const firstFile = createFile('foo');
    const fileInput = getActualFileInput(wrapper);

    fillInputWithFiles(fileInput, [firstFile, createFile('bar')]);
    fileInput.simulate('change');

    assert.calledWith(fakeOnFileSelected, firstFile);
  });

  it('does not call onFileSelected when input changes with no files', () => {
    const wrapper = createInput();
    const fileInput = getActualFileInput(wrapper);

    fileInput.simulate('change');

    assert.notCalled(fakeOnFileSelected);
  });

  it('forwards click on proxy input to actual file input', () => {
    const wrapper = createInput();
    const proxyInput = getProxyInput(wrapper);

    proxyInput.simulate('click');

    assert.called(getActualFileInput(wrapper).getDOMNode().click);
  });

  it('forwards click on proxy button to actual file input', () => {
    const wrapper = createInput();
    const proxyButton = getProxyButton(wrapper);

    proxyButton.simulate('click');

    assert.called(getActualFileInput(wrapper).getDOMNode().click);
  });

  [true, false, undefined].forEach(disabled => {
    it('disables all inner components when FileInput is disabled', () => {
      const wrapper = createInput(disabled);
      const fileInput = getActualFileInput(wrapper);
      const proxyInput = getProxyInput(wrapper);
      const proxyButton = getProxyButton(wrapper);

      assert.equal(fileInput.prop('disabled'), disabled);
      assert.equal(proxyInput.prop('disabled'), disabled);
      assert.equal(proxyButton.prop('disabled'), disabled);
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () =>
          mount(
            <div>
              <FileInput onFileSelected={fakeOnFileSelected} />
            </div>,
          ),
      },
    ]),
  );
});
