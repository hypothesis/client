import { options as preactOptions, render } from 'preact';
import { useRef } from 'preact/hooks';
import { act } from 'preact/test-utils';

import { useArrowKeyNavigation } from '../keyboard-navigation';
import { waitFor } from '../../test-util/wait';

function Toolbar({ navigationOptions = {} }) {
  const containerRef = useRef();

  useArrowKeyNavigation(containerRef, navigationOptions);

  return (
    <div ref={containerRef} data-testid="toolbar">
      <button data-testid="bold">Bold</button>
      <button data-testid="italic">Italic</button>
      <button data-testid="underline">Underline</button>
      <a href="/help" target="_blank" data-testid="help">
        Help
      </a>
    </div>
  );
}

describe('shared/keyboard-navigation', () => {
  describe('useArrowKeyNavigation', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.append(container);
      renderToolbar();
    });

    afterEach(() => {
      container.remove();
    });

    // Workaround for an issue with `useEffect` throwing exceptions during
    // `act` callbacks. Can be removed when https://github.com/preactjs/preact/pull/3530 is shipped.
    let prevDebounceRendering;
    beforeEach(() => {
      prevDebounceRendering = preactOptions.debounceRendering;
    });
    afterEach(() => {
      preactOptions.debounceRendering = prevDebounceRendering;
    });

    function renderToolbar(options = {}) {
      // We render the component with Preact directly rather than using Enzyme
      // for these tests. Since the `tabIndex` state lives only in the DOM,
      // and there are no child components involved, this is more convenient.
      act(() => {
        render(<Toolbar navigationOptions={options} />, container);
      });
      return findElementByTestId('toolbar');
    }

    function findElementByTestId(testId) {
      return container.querySelector(`[data-testid=${testId}]`);
    }

    function pressKey(key) {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key,
      });
      act(() => {
        findElementByTestId('toolbar').dispatchEvent(event);
      });
      return event;
    }

    function currentItem() {
      return document.activeElement.innerText;
    }

    [
      { forwardKey: 'ArrowRight', backKey: 'ArrowLeft' },
      { forwardKey: 'ArrowDown', backKey: 'ArrowUp' },
    ].forEach(({ forwardKey, backKey }) => {
      it('should move focus and tab stop between elements when arrow keys are pressed', () => {
        const steps = [
          // Test navigating forwards.
          [forwardKey, 'Italic'],
          [forwardKey, 'Underline'],
          [forwardKey, 'Help'],

          // Test that navigation wraps to start.
          [forwardKey, 'Bold'],

          // Test that navigation wraps to end.
          [backKey, 'Help'],

          // Test navigating backwards.
          [backKey, 'Underline'],
          [backKey, 'Italic'],
          [backKey, 'Bold'],

          // Test jump to start / end.
          ['End', 'Help'],
          ['Home', 'Bold'],
        ];

        for (let [key, expectedItem] of steps) {
          pressKey(key);

          const currentElement = document.activeElement;
          assert.equal(currentElement.innerText, expectedItem);

          const toolbarButtons = container.querySelectorAll('a,button');
          for (let element of toolbarButtons) {
            if (element === currentElement) {
              assert.equal(element.tabIndex, 0);
            } else {
              assert.equal(element.tabIndex, -1);
            }
          }
        }
      });
    });

    [
      // Keys handled with default options.
      {
        key: 'ArrowLeft',
        shouldHandle: true,
      },
      {
        key: 'ArrowRight',
        shouldHandle: true,
      },
      {
        key: 'ArrowUp',
        shouldHandle: true,
      },
      {
        key: 'ArrowDown',
        shouldHandle: true,
      },
      {
        key: 'End',
        shouldHandle: true,
      },
      {
        key: 'Home',
        shouldHandle: true,
      },

      // Keys never handled.
      {
        key: 'Space',
        shouldHandle: false,
      },

      // Keys not handled if horizontal navigation is disabled
      {
        key: 'ArrowLeft',
        horizontal: false,
        shouldHandle: false,
      },
      {
        key: 'ArrowRight',
        horizontal: false,
        shouldHandle: false,
      },

      // Keys not handled if vertical navigation is disabled
      {
        key: 'ArrowUp',
        vertical: false,
        shouldHandle: false,
      },
      {
        key: 'ArrowDown',
        vertical: false,
        shouldHandle: false,
      },
    ].forEach(({ key, horizontal, vertical, shouldHandle }) => {
      it('should stop keyboard event propagation if event is handled', () => {
        renderToolbar({ horizontal, vertical });

        const handleKeyDown = sinon.stub();
        container.addEventListener('keydown', handleKeyDown);

        const event = pressKey(key);
        assert.equal(
          event.defaultPrevented,
          shouldHandle,
          `${key} defaultPrevented`
        );
        assert.equal(handleKeyDown.called, !shouldHandle, `${key} propagated`);
        handleKeyDown.resetHistory();
      });
    });

    it('should skip hidden elements', () => {
      renderToolbar();
      findElementByTestId('bold').focus();
      findElementByTestId('italic').style.display = 'none';

      pressKey('ArrowRight');

      assert.equal(currentItem(), 'Underline');
    });

    it('should skip disabled elements', () => {
      renderToolbar();
      findElementByTestId('bold').focus();
      findElementByTestId('italic').disabled = true;

      pressKey('ArrowRight');

      assert.equal(currentItem(), 'Underline');
    });

    it('should not respond to Up/Down arrow keys if vertical navigation is disabled', () => {
      renderToolbar({ vertical: false });
      findElementByTestId('bold').focus();

      pressKey('ArrowDown');

      assert.equal(currentItem(), 'Bold');
    });

    it('should not respond to Left/Right arrow keys if horizontal navigation is disabled', () => {
      renderToolbar({ horizontal: false });
      findElementByTestId('bold').focus();

      pressKey('ArrowRight');

      assert.equal(currentItem(), 'Bold');
    });

    it('shows an error if container ref is not initialized', () => {
      function BrokenToolbar() {
        const ref = useRef();
        useArrowKeyNavigation(ref);
        return <div />;
      }

      // Suppress "Add @babel/plugin-transform-react-jsx-source to get a more
      // detailed component stack" warning from the `render` call below.
      sinon.stub(console, 'warn');

      let error;
      try {
        act(() => render(<BrokenToolbar />, container));
      } catch (e) {
        error = e;
      } finally {
        console.warn.restore();
      }

      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Container ref not set');
    });

    it('should respect a custom element selector', () => {
      renderToolbar({
        selector: '[data-testid=bold],[data-testid=italic]',
      });
      findElementByTestId('bold').focus();

      pressKey('ArrowRight');
      assert.equal(currentItem(), 'Italic');
      pressKey('ArrowRight');
      assert.equal(currentItem(), 'Bold');
      pressKey('ArrowLeft');
      assert.equal(currentItem(), 'Italic');
    });

    it('should re-initialize tabindex attributes if current element is removed', async () => {
      const toolbar = renderToolbar();
      const boldButton = toolbar.querySelector('[data-testid=bold]');
      const italicButton = toolbar.querySelector('[data-testid=italic]');

      boldButton.focus();
      assert.equal(boldButton.tabIndex, 0);
      assert.equal(italicButton.tabIndex, -1);

      boldButton.remove();

      // nb. tabIndex update is async because it uses MutationObserver
      await waitFor(() => italicButton.tabIndex === 0);
    });

    it('should re-initialize tabindex attributes if current element is disabled', async () => {
      renderToolbar();
      const boldButton = findElementByTestId('bold');
      const italicButton = findElementByTestId('italic');

      boldButton.focus();
      assert.equal(boldButton.tabIndex, 0);
      assert.equal(italicButton.tabIndex, -1);

      boldButton.disabled = true;

      // nb. tabIndex update is async because it uses MutationObserver
      await waitFor(() => italicButton.tabIndex === 0);
    });
  });
});
