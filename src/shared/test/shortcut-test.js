import { render } from 'preact';
import { act } from 'preact/test-utils';

import { matchShortcut, installShortcut, useShortcut } from '../shortcut';

function createEvent(key, { ctrl, alt, shift, meta } = {}) {
  return {
    key,
    ctrlKey: !!ctrl,
    altKey: !!alt,
    shiftKey: !!shift,
    metaKey: !!meta,
  };
}

describe('shared/shortcut', () => {
  describe('matchShortcut', () => {
    [
      // Single modifier.
      { shortcut: 'ctrl+a', event: createEvent('a', { ctrl: true }) },
      { shortcut: 'meta+a', event: createEvent('a', { meta: true }) },
      { shortcut: 'shift+a', event: createEvent('a', { shift: true }) },
      { shortcut: 'alt+a', event: createEvent('a', { alt: true }) },

      // Multiple modifiers.
      {
        shortcut: 'ctrl+shift+a',
        event: createEvent('a', { ctrl: true, shift: true }),
      },
      {
        shortcut: 'alt+meta+a',
        event: createEvent('a', { alt: true, meta: true }),
      },

      // No modifier.
      { shortcut: 'a', event: createEvent('a') },
    ].forEach(({ shortcut, event }) => {
      it('should match if modifiers match', () => {
        assert.isTrue(matchShortcut(event, shortcut));
      });
    });

    [
      { shortcut: 'ctrl+a', event: createEvent('a', { ctrl: false }) },
      {
        shortcut: 'ctrl+shift+a',
        event: createEvent('a', { ctrl: true, shift: false }),
      },
    ].forEach(({ shortcut, event }) => {
      it('should not match if modifiers do not match', () => {
        assert.isFalse(matchShortcut(event, shortcut));
      });
    });

    [
      { shortcut: 'a', event: createEvent('a') },
      { shortcut: 'enter', event: createEvent('Enter') },
    ].forEach(({ shortcut, event }) => {
      it('should match if non-modifier key matches', () => {
        assert.isTrue(matchShortcut(event, shortcut));
      });
    });

    [{ shortcut: 'a', event: createEvent('b') }].forEach(
      ({ shortcut, event }) => {
        it('should not match if non-modifier key does not match', () => {
          assert.isFalse(matchShortcut(event, shortcut));
        });
      }
    );

    ['ctrl', 'META'].forEach(shortcut => {
      it('should throw an error if no non-modifier key is specified', () => {
        assert.throws(() => {
          matchShortcut(createEvent('a'), shortcut);
        });
      });
    });

    it('should throw an error if multiple non-modifier keys are specified', () => {
      assert.throws(() => {
        matchShortcut(createEvent('a'), 'a+b');
      }, 'Multiple non-modifier keys specified');
    });
  });

  /**
   * Simulate a key press on a document.
   *
   * In an HTML document this will go to the body if no other element is
   * focused. In an XHTML document this will go to the document element in
   * Safari and Chrome. In both cases the event will bubble up to the document
   * element.
   */
  function pressKey(key, element = document.documentElement) {
    const event = new KeyboardEvent('keydown', { key });
    element.dispatchEvent(event);
    return event;
  }

  describe('installShortcut', () => {
    it('should install a shortcut listener on the document element', () => {
      const onPress = sinon.stub();
      const removeShortcut = installShortcut('a', onPress);

      const event = pressKey('a');
      removeShortcut();

      assert.calledWith(onPress, event);
    });

    it('should install a shortcut listener on a custom root element', () => {
      const onPress = sinon.stub();
      const el = document.createElement('div');
      const removeShortcut = installShortcut('a', onPress, { rootElement: el });

      const event = pressKey('a', el);
      removeShortcut();

      assert.calledWith(onPress, event);
    });

    it('should not trigger if not-matching key is pressed', () => {
      const onPress = sinon.stub();
      const removeShortcut = installShortcut('a', onPress);

      pressKey('b');
      removeShortcut();

      assert.notCalled(onPress);
    });

    it('should remove shortcut listener when returned callback is called', () => {
      const onPress = sinon.stub();
      const removeShortcut = installShortcut('a', onPress);

      removeShortcut();
      pressKey('a');

      assert.notCalled(onPress);
    });
  });

  describe('useShortcut', () => {
    function Button({ shortcut = null, onClick }) {
      useShortcut(shortcut, onClick);
      return <button onClick={onClick}>Shortcut test</button>;
    }

    let container;
    beforeEach(() => {
      container = document.createElement('div');
    });

    afterEach(() => {
      // Unmount component to remove any shortcut handlers.
      act(() => {
        render(null, container);
      });
    });

    it('should install a shortcut when component is mounted', () => {
      const onClick = sinon.stub();

      act(() => {
        render(<Button shortcut="a" onClick={onClick} />, container);
      });
      pressKey('a');

      assert.called(onClick);
    });

    it('should not install a shortcut if `shortcut` is null', () => {
      const onClick = sinon.stub();

      act(() => {
        render(<Button onClick={onClick} />, container);
      });
      pressKey('a');

      assert.notCalled(onClick);
    });

    it('should remove the shortcut when component is unmounted', () => {
      const onClick = sinon.stub();

      act(() => {
        render(<Button onClick={onClick} />, container);
        render(null, container);
      });
      pressKey('a');

      assert.notCalled(onClick);
    });
  });
});
