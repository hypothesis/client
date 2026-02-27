import { checkAccessibility } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';

import SearchIconButton, { $imports } from '../SearchIconButton';

describe('SearchIconButton', () => {
  let fakeStore;
  let fakeShortcuts;
  let fakeIsMacOS;

  const createSearchIconButton = () => {
    return mount(<SearchIconButton />, { connected: true });
  };

  beforeEach(() => {
    fakeStore = {
      isLoading: sinon.stub().returns(false),
      isSidebarPanelOpen: sinon.stub().returns(false),
      openSidebarPanel: sinon.stub(),
      toggleSidebarPanel: sinon.stub(),
    };
    fakeShortcuts = {
      openSearch: '/',
    };
    fakeIsMacOS = sinon.stub().returns(false);

    $imports.$mock({
      '../../store': { useSidebarStore: () => fakeStore },
      '../../../shared/shortcut-config': {
        useShortcutsConfig: () => ({
          ...fakeShortcuts,
        }),
      },
      '../../../shared/user-agent': {
        isMacOS: fakeIsMacOS,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('renders loading indicator when app is in a "loading" state', () => {
    fakeStore.isLoading.returns(true);
    const wrapper = createSearchIconButton();

    assert.isTrue(wrapper.exists('Spinner'));
    assert.isFalse(wrapper.exists('PressableIconButton'));
  });

  it('renders search button when app is not in "loading" state', () => {
    fakeStore.isLoading.returns(false);
    const wrapper = createSearchIconButton();

    assert.isFalse(wrapper.exists('Spinner'));
    assert.isTrue(wrapper.exists('PressableIconButton'));
  });

  it('toggles search panel when button is clicked', () => {
    const wrapper = createSearchIconButton();
    wrapper.find('PressableIconButton').find('button').simulate('click');
    assert.calledWith(fakeStore.toggleSidebarPanel, 'searchAnnotations');
  });

  [true, false].forEach(isSearchPanelOpen => {
    it('sets button state based on panel state', () => {
      fakeStore.isSidebarPanelOpen.returns(isSearchPanelOpen);

      const wrapper = createSearchIconButton();
      const { expanded, pressed } = wrapper.find('PressableIconButton').props();

      assert.equal(expanded, isSearchPanelOpen);
      assert.equal(pressed, isSearchPanelOpen);
    });
  });

  describe('shortcut key handling', () => {
    context('when "/" is pressed outside of the component element', () => {
      const pressForwardSlashKey = () =>
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: '/',
          }),
        );

      it('opens search panel if it is closed', () => {
        createSearchIconButton();
        pressForwardSlashKey();

        assert.calledWith(fakeStore.openSidebarPanel, 'searchAnnotations');
      });

      it('does nothing if search panel is already open', () => {
        fakeStore.isSidebarPanelOpen.returns(true);

        createSearchIconButton();
        pressForwardSlashKey();

        assert.notCalled(fakeStore.openSidebarPanel);
      });
    });

    it('opens search panel on non-macOS systems when "ctrl-K" is pressed outside of the component element', () => {
      fakeIsMacOS.returns(false);
      createSearchIconButton();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'k',
          ctrlKey: true,
        }),
      );

      assert.calledWith(fakeStore.openSidebarPanel, 'searchAnnotations');
    });

    it('does nothing if search panel is already open when "ctrl-K" is pressed', () => {
      fakeIsMacOS.returns(false);
      fakeStore.isSidebarPanelOpen.returns(true);

      createSearchIconButton();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'k',
          ctrlKey: true,
        }),
      );

      assert.notCalled(fakeStore.openSidebarPanel);
    });

    it('does nothing if search panel is already open when "Cmd-K" is pressed', () => {
      fakeIsMacOS.returns(true);
      fakeStore.isSidebarPanelOpen.returns(true);

      createSearchIconButton();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'k',
          metaKey: true,
        }),
      );

      assert.notCalled(fakeStore.openSidebarPanel);
    });

    it('returns early when "/" shortcut handler is invoked while focus is in an input', () => {
      const handlers = [];

      $imports.$mock({
        '../../../shared/shortcut': {
          useShortcut: (shortcut, handler) =>
            handlers.push({ shortcut, handler }),
        },
      });

      const input = document.createElement('input');
      document.body.append(input);

      try {
        createSearchIconButton();

        const openSearchHandler = handlers.find(
          h => h.shortcut === '/',
        )?.handler;
        assert.ok(openSearchHandler, 'handler for "/" should be registered');

        openSearchHandler({
          key: '/',
          metaKey: false,
          ctrlKey: false,
          target: input,
        });

        assert.notCalled(fakeStore.openSidebarPanel);
      } finally {
        input.remove();
      }
    });

    it('opens search panel for macOS when "Cmd-K" is pressed outside of the component element', () => {
      fakeIsMacOS.returns(true);
      createSearchIconButton();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'k',
          metaKey: true,
        }),
      );

      assert.calledWith(fakeStore.openSidebarPanel, 'searchAnnotations');
    });

    ['textarea', 'input'].forEach(elementName => {
      it('does not steal focus when "/" pressed if user is in an input field', () => {
        const input = document.createElement(elementName);
        document.body.append(input);

        try {
          input.id = 'an-input';

          createSearchIconButton();
          input.focus();

          assert.equal(document.activeElement, input);

          input.dispatchEvent(
            new KeyboardEvent('keydown', {
              bubbles: true,
              cancelable: true,
              key: '/',
            }),
          );

          assert.notCalled(fakeStore.openSidebarPanel);
        } finally {
          input.remove();
        }
      });
    });

    it('does not open search panel if user is in an input field and presses "Ctrl-k"', () => {
      fakeIsMacOS.returns(false);
      const input = document.createElement('input');
      document.body.append(input);
      try {
        input.id = 'an-input';

        createSearchIconButton();
        input.focus();

        assert.equal(document.activeElement, input);

        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'k',
            ctrlKey: true,
          }),
        );

        assert.notCalled(fakeStore.openSidebarPanel);
      } finally {
        input.remove();
      }
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility([
      {
        content: () => createSearchIconButton(),
      },
      {
        name: 'loading state',
        content: () => {
          fakeStore.isLoading.returns(true);
          return createSearchIconButton();
        },
      },
    ]),
  );
});
