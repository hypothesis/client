import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import sinon from 'sinon';

import { wrapMentions } from '../../helpers/mentions';
import { LinkType } from '../../markdown-commands';
import MarkdownEditor, { $imports } from '../MarkdownEditor';

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
  let fakeIsMacOS;
  let MarkdownView;

  beforeEach(() => {
    fakeMarkdownCommands.convertSelectionToLink.resetHistory();
    fakeMarkdownCommands.toggleBlockStyle.resetHistory();
    fakeMarkdownCommands.toggleSpanStyle.resetHistory();
    fakeIsMacOS = sinon.stub().returns(false);

    MarkdownView = function MarkdownView() {
      return null;
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../markdown-commands': fakeMarkdownCommands,
      './MarkdownView': MarkdownView,
      '../../shared/user-agent': {
        isMacOS: fakeIsMacOS,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  function createComponent(props = {}, mountProps = {}) {
    return mount(
      <MarkdownEditor
        label="Test editor"
        text="test"
        mentionsEnabled={false}
        usersForMentions={[]}
        {...props}
      />,
      mountProps,
    );
  }

  function typeInTextarea(wrapper, text, key = undefined) {
    const textarea = wrapper.find('textarea');
    const textareaDOMNode = textarea.getDOMNode();

    textareaDOMNode.value = text;
    textareaDOMNode.selectionStart = text.length;

    textarea.simulate('keyup', { key });
  }

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
      effect: [fakeMarkdownCommands.toggleBlockStyle, sinon.match.func],
    },
  ];
  commands.forEach(({ command, key, effect }) => {
    describe(`"${command}" toolbar command`, () => {
      it('applies formatting when toolbar button is clicked', () => {
        const onEditText = sinon.stub();
        const text = 'toolbar command test';
        const wrapper = createComponent({ text, onEditText });
        const button = wrapper.find(
          `ToolbarButton[title="${command}"] > IconButton button`,
        );
        const input = wrapper.find('textarea').getDOMNode();
        input.selectionStart = 0;
        input.selectionEnd = text.length;

        button.simulate('click');

        assert.calledWith(onEditText, 'formatted text');
        const [formatFunction, ...args] = effect;
        assert.calledWith(
          formatFunction,
          sinon.match({ text, selectionStart: 0, selectionEnd: text.length }),
          ...args,
        );
      });

      if (key) {
        describe('renders appropriate tooltip for user OS', () => {
          [
            {
              setOs: () => {
                fakeIsMacOS.returns(true);
              },
              expectedModifier: 'Cmd',
            },
            {
              setOs: () => {
                fakeIsMacOS.returns(false);
              },
              expectedModifier: 'Ctrl',
            },
          ].forEach(test => {
            it('should show the correct modifier key for user OS in button `title`', () => {
              // Test that button `title` shows the correct modifier for user OS:
              // `Cmd-shortcut` for Mac users and `Ctrl-shortcut` for everyone else
              test.setOs();
              const wrapper = createComponent();
              const button = wrapper.find(
                `ToolbarButton[title="${command}"] > IconButton`,
              );

              const buttonTitlePattern = new RegExp(
                `${test.expectedModifier}-${key.toUpperCase()}`,
              );
              assert.match(button.props().title, buttonTitlePattern);
            });
          });
        });
        // Test that shortcuts are executed with different Ctrl- and Cmd- combos
        const keyEventDetails = [
          { ctrlKey: true, metaKey: false, key },
          { ctrlKey: false, metaKey: true, key },
          { ctrlKey: true, metaKey: true, key },
        ];

        keyEventDetails.forEach(keyEvent => {
          it('applies formatting when shortcut key is pressed', () => {
            const onEditText = sinon.stub();
            const text = 'toolbar shortcut test';
            const wrapper = createComponent({ text, onEditText });
            const input = wrapper.find('textarea');
            input.getDOMNode().selectionStart = 0;
            input.getDOMNode().selectionEnd = text.length;

            input.simulate('keydown', {
              ctrlKey: keyEvent.ctrlKey,
              metaKey: keyEvent.metaKey,
              key: keyEvent.key,
            });

            assert.calledWith(onEditText, 'formatted text');
            const [formatFunction, ...args] = effect;
            assert.calledWith(
              formatFunction,
              sinon.match({
                text,
                selectionStart: 0,
                selectionEnd: text.length,
              }),
              ...args,
            );
          });
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
      const wrapper = createComponent({ onEditText });
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
    const wrapper = createComponent({ onEditText });
    const input = wrapper.find('textarea').getDOMNode();
    input.value = 'changed';
    wrapper.find('textarea').simulate('input');
    assert.calledWith(onEditText, 'changed');
  });

  it('enters preview mode when Preview button is clicked', () => {
    const wrapper = createComponent();

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
    const wrapper = createComponent();

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
        render(<MarkdownEditor label="An editor" text="test" />, container);
      });

      assert.equal(document.activeElement.nodeName, 'TEXTAREA');
    } finally {
      container.remove();
    }
  });

  it('sets accessible label for input field', () => {
    const wrapper = createComponent({ label: 'Enter comment' });
    const inputField = wrapper.find('textarea');
    assert.equal(inputField.prop('aria-label'), 'Enter comment');
    assert.equal(inputField.prop('placeholder'), 'Enter comment');
  });

  it('unwraps mention tags', () => {
    const wrapper = createComponent({
      text: wrapMentions('Hello @bob', 'hypothes.is'),
    });

    assert.equal(wrapper.find('TextArea').prop('value'), 'Hello @bob');
  });

  describe('keyboard navigation', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(<MarkdownEditor label="Test editor" text="test" />, {
        connected: true,
      });
    });

    const pressKey = key =>
      wrapper
        .find('[data-testid="markdown-toolbar"]')
        .simulate('keydown', { key });

    function testArrowKeySequence(buttons) {
      for (const button of buttons) {
        pressKey('ArrowRight');
        const label =
          document.activeElement.getAttribute('title') ||
          document.activeElement.innerText;
        assert.include(label, button);
      }
    }

    // This is a basic test that arrow key navigation is enabled.
    // `useArrowKeyNavigation` tests cover behavior in more detail.
    it('arrow keys navigate through buttons', () => {
      // Sequence of buttons we expect to be focused when the first action
      // ("Bold") action is initially focused and we press the right arrow key
      // until focus returns to it.
      const buttons = [
        'Italic',
        'Quote',
        'Insert link',
        'Insert image',
        'Insert math',
        'Numbered list',
        'Bulleted list',
        'Formatting help',
        'Preview',
        'Bold',
      ];
      testArrowKeySequence(buttons);
    });

    it('arrow keys navigate through enabled buttons when `isPreviewing` is true', () => {
      const previewButton = wrapper
        .find('button')
        .filterWhere(el => el.text() === 'Preview');
      previewButton.simulate('click');

      pressKey('Home');

      const buttons = ['Write', 'Formatting help', 'Write'];
      testArrowKeySequence(buttons);
    });
  });

  it('applies `textStyle` style to <textarea>', () => {
    const textStyle = { fontFamily: 'serif' };
    const wrapper = createComponent({ textStyle });
    assert.deepEqual(wrapper.find('textarea').prop('style'), textStyle);
  });

  it('applies `textStyle` style to preview', () => {
    const textStyle = { fontFamily: 'serif' };
    const wrapper = createComponent({ textStyle });

    act(() => {
      wrapper.find('Toolbar').props().onTogglePreview();
    });
    wrapper.update();

    assert.deepEqual(wrapper.find('MarkdownView').prop('style'), textStyle);
  });

  [true, false].forEach(showHelpLink => {
    it('hides help menu when `showHelpLink` is false', () => {
      const wrapper = createComponent({ showHelpLink });
      const helpLink = wrapper.find('Link[aria-label="Formatting help"]');
      assert.equal(helpLink.exists(), showHelpLink);
    });
  });

  context('when @mentions are enabled', () => {
    function keyDownInTextarea(wrapper, key) {
      const textarea = wrapper.find('textarea');
      textarea.simulate('keydown', { key });
      wrapper.update();
    }

    function getHighlightedSuggestion(wrapper) {
      return wrapper
        .find('MentionSuggestionsPopover')
        .prop('highlightedSuggestion');
    }

    function suggestionsPopoverIsOpen(wrapper) {
      return wrapper.find('MentionSuggestionsPopover').prop('open');
    }

    [true, false].forEach(mentionsEnabled => {
      it('renders Popover if @mentions are enabled', () => {
        const wrapper = createComponent({ mentionsEnabled });
        assert.equal(
          wrapper.exists('MentionSuggestionsPopover'),
          mentionsEnabled,
        );

        // Popover is opened after typing "@"
        typeInTextarea(wrapper, '@');
        if (mentionsEnabled) {
          assert.isTrue(suggestionsPopoverIsOpen(wrapper));
        }
      });
    });

    it('opens Popover when an @mention is typed in textarea', () => {
      const wrapper = createComponent({ mentionsEnabled: true });
      typeInTextarea(wrapper, '@johndoe');

      assert.isTrue(suggestionsPopoverIsOpen(wrapper));
    });

    it('closes Popover when cursor moves away from @mention', () => {
      const wrapper = createComponent({ mentionsEnabled: true });

      // Popover is open after typing the at-mention
      typeInTextarea(wrapper, '@johndoe');
      assert.isTrue(suggestionsPopoverIsOpen(wrapper));

      // Once a space is typed after the at-mention, the popover is closed
      typeInTextarea(wrapper, '@johndoe ');
      assert.isFalse(suggestionsPopoverIsOpen(wrapper));
    });

    it('closes Popover when @mention is removed', () => {
      const wrapper = createComponent({ mentionsEnabled: true });

      // Popover is open after typing the at-mention
      typeInTextarea(wrapper, '@johndoe');
      assert.isTrue(suggestionsPopoverIsOpen(wrapper));

      // Once the at-mention is removed, the popover is closed
      typeInTextarea(wrapper, '');
      assert.isFalse(suggestionsPopoverIsOpen(wrapper));
    });

    it('opens Popover when cursor moves into an @mention', () => {
      const text = '@johndoe ';
      const wrapper = createComponent({
        text,
        mentionsEnabled: true,
      });
      const textarea = wrapper.find('textarea');
      const textareaDOMNode = textarea.getDOMNode();

      // Popover is initially closed
      assert.isFalse(suggestionsPopoverIsOpen(wrapper));

      // Move cursor to the left
      textareaDOMNode.selectionStart = text.length - 1;
      act(() => textareaDOMNode.dispatchEvent(new KeyboardEvent('keyup')));
      wrapper.update();

      assert.isTrue(suggestionsPopoverIsOpen(wrapper));
    });

    it('closes Popover when onClose is called', () => {
      const wrapper = createComponent({ mentionsEnabled: true });

      // Popover is initially open
      typeInTextarea(wrapper, '@johndoe');
      assert.isTrue(suggestionsPopoverIsOpen(wrapper));

      wrapper.find('MentionSuggestionsPopover').props().onClose();
      wrapper.update();
      assert.isFalse(suggestionsPopoverIsOpen(wrapper));
    });

    it('ignores `Escape` key press in textarea', () => {
      const wrapper = createComponent({ mentionsEnabled: true });

      // Popover is still closed if the key is `Escape`
      typeInTextarea(wrapper, '@johndoe', 'Escape');
      assert.isFalse(suggestionsPopoverIsOpen(wrapper));
    });

    it('opens popover when clicking textarea and moving the caret to a mention', () => {
      const text = 'text @johndoe more text';
      const wrapper = createComponent({
        text,
        mentionsEnabled: true,
      });
      const textarea = wrapper.find('textarea');
      const textareaDOMNode = textarea.getDOMNode();

      // Popover is initially closed
      assert.isFalse(suggestionsPopoverIsOpen(wrapper));

      // Move cursor to overlap with the mention
      textareaDOMNode.selectionStart = text.indexOf('@') + 1;
      act(() => textareaDOMNode.dispatchEvent(new MouseEvent('click')));
      wrapper.update();

      assert.isTrue(suggestionsPopoverIsOpen(wrapper));
    });

    it('allows changing highlighted suggestion via vertical arrow keys', () => {
      const wrapper = createComponent({
        mentionsEnabled: true,
        usersForMentions: [
          { username: 'one', displayName: 'johndoe' },
          { username: 'two', displayName: 'johndoe' },
          { username: 'three', displayName: 'johndoe' },
        ],
      });

      typeInTextarea(wrapper, '@johndoe');

      // Initially, first suggestion is highlighted
      assert.equal(getHighlightedSuggestion(wrapper), 0);

      // Pressing arrow up has no effect while first suggestion is highlighted
      keyDownInTextarea(wrapper, 'ArrowUp');
      assert.equal(getHighlightedSuggestion(wrapper), 0);

      // Pressing arrow down, we can highlight subsequent suggestions
      keyDownInTextarea(wrapper, 'ArrowDown');
      assert.equal(getHighlightedSuggestion(wrapper), 1);
      keyDownInTextarea(wrapper, 'ArrowDown');
      assert.equal(getHighlightedSuggestion(wrapper), 2);

      // Once last suggestion is highlighted, pressing arrow down has no effect
      keyDownInTextarea(wrapper, 'ArrowDown');
      assert.equal(getHighlightedSuggestion(wrapper), 2);

      // Pressing arrow up, we can highlight preceding suggestions
      keyDownInTextarea(wrapper, 'ArrowUp');
      assert.equal(getHighlightedSuggestion(wrapper), 1);
      keyDownInTextarea(wrapper, 'ArrowUp');
      assert.equal(getHighlightedSuggestion(wrapper), 0);
    });

    it('applies highlighted suggestion when `Enter` is pressed', () => {
      const onEditText = sinon.stub();
      const wrapper = createComponent({
        onEditText,
        mentionsEnabled: true,
        usersForMentions: [
          { username: 'one', displayName: 'johndoe' },
          { username: 'two', displayName: 'johndoe' },
          { username: 'three', displayName: 'johndoe' },
        ],
      });

      typeInTextarea(wrapper, '@johndoe');

      // Arrow down is pressed to highlight second suggestion
      keyDownInTextarea(wrapper, 'ArrowDown');
      // Then Enter is pressed to apply it
      keyDownInTextarea(wrapper, 'Enter');

      // The textarea should include the username for second suggestion
      assert.calledWith(onEditText, '@two ');
    });

    [
      // With no users, there won't be any suggestions regardless of the text
      { usersForMentions: [], text: '@', expectedSuggestions: 0 },

      // With users, there won't be suggestions when none of them matches the
      // mention
      {
        usersForMentions: [
          { username: 'one', displayName: 'johndoe' },
          { username: 'two', displayName: 'johndoe' },
          { username: 'three', displayName: 'johndoe' },
        ],
        text: '@nothing_will_match',
        expectedSuggestions: 0,
      },

      // With users, there will be suggestions when any of them matches the
      // mention
      {
        usersForMentions: [
          { username: 'one', displayName: 'johndoe' },
          { username: 'two', displayName: 'johndoe' },
          { username: 'three', displayName: 'johndoe' },
        ],
        text: '@two',
        expectedSuggestions: 1,
      },
      {
        usersForMentions: [
          { username: 'one', displayName: 'johndoe' },
          { username: 'two', displayName: 'johndoe' },
          { username: 'three', displayName: 'johndoe' },
        ],
        text: '@johndoe',
        expectedSuggestions: 3,
      },
    ].forEach(({ usersForMentions, text, expectedSuggestions }) => {
      it('suggests expected users for mention text', () => {
        const wrapper = createComponent({
          mentionsEnabled: true,
          usersForMentions,
        });

        typeInTextarea(wrapper, text);

        assert.equal(
          wrapper.find('MentionSuggestionsPopover').prop('users').length,
          expectedSuggestions,
        );
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createComponent(),
      },
      {
        name: 'Preview mode',
        content: () => {
          const wrapper = createComponent();

          const previewButton = wrapper
            .find('button')
            .filterWhere(el => el.text() === 'Preview');
          previewButton.simulate('click');

          return wrapper;
        },
      },
      {
        name: 'Suggestions popover',
        content: () => {
          $imports.$restore({
            // We need to render MentionSuggestionsPopover, as some aria
            // attributes reference elements rendered by it
            './MentionSuggestionsPopover': true,
          });

          const wrapper = createComponent(
            {
              mentionsEnabled: true,
              usersForMentions: [
                { username: 'one', displayName: 'johndoe' },
                { username: 'two', displayName: 'johndoe' },
                { username: 'three', displayName: 'johndoe' },
              ],
            },
            { connected: true },
          );
          typeInTextarea(wrapper, '@johndoe');

          return wrapper;
        },
      },
    ]),
  );
});
