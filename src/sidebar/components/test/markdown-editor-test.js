import { mount } from 'enzyme';
import { createElement, render } from 'preact';
import { act } from 'preact/test-utils';

import { LinkType } from '../../markdown-commands';
import MarkdownEditor from '../markdown-editor';
import { $imports } from '../markdown-editor';

import { checkAccessibility } from '../../../test-util/accessibility';

describe('MarkdownEditor', () => {
  const formatResult = {
    text: 'formatted text',
    selectionStart: 0,
    selectionEnd: 0,
  };
  const fakeMarkdownCommands = {
    convertSelectionToLink: sinon.stub().returns(formatResult),
    toggleBlockStyle: sinon.stub().returns(formatResult),
    toggleSpanStyle: sinon.stub().returns(formatResult),
    LinkType,
  };

  let MarkdownView;

  beforeEach(() => {
    fakeMarkdownCommands.convertSelectionToLink.resetHistory();
    fakeMarkdownCommands.toggleBlockStyle.resetHistory();
    fakeMarkdownCommands.toggleSpanStyle.resetHistory();

    MarkdownView = function MarkdownView() {
      return null;
    };

    $imports.$mock({
      '../markdown-commands': fakeMarkdownCommands,
      './markdown-view': MarkdownView,
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  const commands = [
    {
      command: 'Bold',
      key: 'b',
      effect: [fakeMarkdownCommands.toggleSpanStyle, '**', '**', 'Bold'],
    },
    {
      command: 'Italic',
      key: 'i',
      effect: [fakeMarkdownCommands.toggleSpanStyle, '*', '*', 'Italic'],
    },
    {
      command: 'Quote',
      key: 'q',
      effect: [fakeMarkdownCommands.toggleBlockStyle, '> '],
    },
    {
      command: 'Insert link',
      key: 'l',
      effect: [fakeMarkdownCommands.convertSelectionToLink],
    },
    {
      command: 'Insert image',
      key: null,
      effect: [
        fakeMarkdownCommands.convertSelectionToLink,
        fakeMarkdownCommands.LinkType.IMAGE_LINK,
      ],
    },
    {
      command: 'Insert math (LaTeX is supported)',
      key: null,
      effect: [
        fakeMarkdownCommands.toggleSpanStyle,
        '$$',
        '$$',
        'Insert LaTeX',
      ],
    },
    {
      command: 'Bulleted list',
      key: 'u',
      effect: [fakeMarkdownCommands.toggleBlockStyle, '* '],
    },
    {
      command: 'Numbered list',
      key: 'o',
      effect: [fakeMarkdownCommands.toggleBlockStyle, '1. '],
    },
  ];
  commands.forEach(({ command, key, effect }) => {
    describe(`"${command}" toolbar command`, () => {
      it('applies formatting when toolbar button is clicked', () => {
        const onEditText = sinon.stub();
        const wrapper = mount(
          <MarkdownEditor text="test" onEditText={onEditText} />
        );
        const button = wrapper.find(
          `ToolbarButton[title="${command}"] > button`
        );
        const input = wrapper.find('textarea').getDOMNode();
        input.selectionStart = 0;
        input.selectionEnd = 4;

        button.simulate('click');

        assert.calledWith(onEditText, {
          text: 'formatted text',
        });
        const [formatFunction, ...args] = effect;
        assert.calledWith(
          formatFunction,
          sinon.match({ text: 'test', selectionStart: 0, selectionEnd: 4 }),
          ...args
        );
      });

      if (key) {
        it('applies formatting when shortcut key is pressed', () => {
          const onEditText = sinon.stub();
          const wrapper = mount(
            <MarkdownEditor text="test" onEditText={onEditText} />
          );
          const input = wrapper.find('textarea');
          input.getDOMNode().selectionStart = 0;
          input.getDOMNode().selectionEnd = 4;

          input.simulate('keydown', {
            ctrlKey: true,
            key,
          });

          assert.calledWith(onEditText, {
            text: 'formatted text',
          });
          const [formatFunction, ...args] = effect;
          assert.calledWith(
            formatFunction,
            sinon.match({ text: 'test', selectionStart: 0, selectionEnd: 4 }),
            ...args
          );
        });
      }
    });
  });

  [
    {
      // Shortcut letter but without ctrl key.
      key: 'b',
      ctrlKey: false,
    },
    {
      // Ctrl key with non-shortcut letter
      key: 'w',
      ctrlKey: true,
    },
  ].forEach(({ ctrlKey, key }) => {
    it('does not apply formatting when a non-shortcut key is pressed', () => {
      const onEditText = sinon.stub();
      const wrapper = mount(
        <MarkdownEditor text="test" onEditText={onEditText} />
      );
      const input = wrapper.find('textarea');

      input.simulate('keydown', {
        ctrlKey,
        key,
      });

      assert.notCalled(onEditText);
    });
  });

  it('calls `onEditText` callback when text is changed', () => {
    const onEditText = sinon.stub();
    const wrapper = mount(
      <MarkdownEditor text="test" onEditText={onEditText} />
    );
    const input = wrapper.find('textarea').getDOMNode();
    input.value = 'changed';
    wrapper.find('textarea').simulate('input');
    assert.calledWith(onEditText, {
      text: 'changed',
    });
  });

  it('enters preview mode when Preview button is clicked', () => {
    const wrapper = mount(<MarkdownEditor text="test" />);

    const previewButton = wrapper
      .find('button')
      .filterWhere(el => el.text() === 'Preview');
    previewButton.simulate('click');

    assert.isFalse(wrapper.find('textarea').exists());
    assert.isTrue(wrapper.find('MarkdownView').exists());
    wrapper
      .find('button')
      .filterWhere(el => el.text() !== 'Write')
      .forEach(el => assert.isTrue(el.prop('disabled')));
  });

  it('exits preview mode when Write button is clicked', () => {
    const wrapper = mount(<MarkdownEditor text="test" />);

    // Switch to "Preview" mode.
    const previewButton = wrapper
      .find('button')
      .filterWhere(el => el.text() === 'Preview');
    previewButton.simulate('click');

    // Switch back to "Write" mode.
    const writeButton = wrapper
      .find('button')
      .filterWhere(el => el.text() === 'Write');
    writeButton.simulate('click');

    assert.isTrue(wrapper.find('textarea').exists());
    assert.isFalse(wrapper.find('MarkdownView').exists());
    wrapper
      .find('button')
      .filterWhere(el => el.text() !== 'Preview')
      .forEach(el => assert.isFalse(el.prop('disabled')));
  });

  it('focuses the input field when created', () => {
    const container = document.createElement('div');
    try {
      document.body.focus();
      document.body.appendChild(container);
      act(() => {
        render(<MarkdownEditor text="test" />, container);
      });

      assert.equal(document.activeElement.nodeName, 'TEXTAREA');
    } finally {
      container.remove();
    }
  });

  // FIXME-A11Y
  it.skip(
    'should pass a11y checks',
    checkAccessibility([
      {
        // eslint-disable-next-line react/display-name
        content: () => <MarkdownEditor text="test" />,
      },
      {
        name: 'Preview mode',
        content: () => {
          const wrapper = mount(<MarkdownEditor text="test" />);

          const previewButton = wrapper
            .find('button')
            .filterWhere(el => el.text() === 'Preview');
          previewButton.simulate('click');

          return wrapper;
        },
      },
    ])
  );
});
