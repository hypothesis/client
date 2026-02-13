import {
  getAllShortcuts,
  getDefaultShortcuts,
  parseShortcutInputEvent,
  resetShortcuts,
  setAllShortcuts,
  setShortcut,
  subscribeShortcuts,
} from '../shortcut-config';

describe('shared/shortcut-config', () => {
  beforeEach(() => {
    resetShortcuts();
  });

  describe('setShortcut', () => {
    it('trims and stores shortcut values', () => {
      setShortcut('applyUpdates', 'a');
      assert.equal(getAllShortcuts().applyUpdates, 'a');
    });

    it('stores null when given an empty value', () => {
      setShortcut('applyUpdates', '');
      assert.isNull(getAllShortcuts().applyUpdates);
    });
  });

  describe('setAllShortcuts', () => {
    it('merges defaults and ignores invalid values', () => {
      const defaults = getDefaultShortcuts();

      setAllShortcuts({
        applyUpdates: 'k',
        annotateSelection: null,
        openSearch: 123,
        extra: 'ignored',
      });

      const shortcuts = getAllShortcuts();
      assert.equal(shortcuts.applyUpdates, 'k');
      assert.isNull(shortcuts.annotateSelection);
      assert.equal(shortcuts.openSearch, defaults.openSearch);
      assert.isUndefined(shortcuts.extra);
    });
  });

  describe('keyboard annotation shortcuts', () => {
    it('has default values for activateRectMove, activateRectResize, and activatePoint', () => {
      const defaults = getDefaultShortcuts();
      assert.equal(defaults.activateRectMove, 'ctrl+shift+y');
      assert.equal(defaults.activateRectResize, 'ctrl+shift+j');
      assert.equal(defaults.activatePoint, 'ctrl+shift+u');
    });

    it('allows setting and getting keyboard annotation shortcuts', () => {
      setShortcut('activateRectMove', 'ctrl+shift+m');
      setShortcut('activateRectResize', null);
      setShortcut('activatePoint', 'ctrl+shift+p');

      const shortcuts = getAllShortcuts();
      assert.equal(shortcuts.activateRectMove, 'ctrl+shift+m');
      assert.isNull(shortcuts.activateRectResize);
      assert.equal(shortcuts.activatePoint, 'ctrl+shift+p');
    });

    it('resets keyboard annotation shortcuts to defaults', () => {
      setShortcut('activateRectMove', 'ctrl+shift+m');
      setShortcut('activateRectResize', null);
      setShortcut('activatePoint', 'ctrl+shift+p');

      resetShortcuts();

      const shortcuts = getAllShortcuts();
      assert.equal(shortcuts.activateRectMove, 'ctrl+shift+y');
      assert.equal(shortcuts.activateRectResize, 'ctrl+shift+j');
      assert.equal(shortcuts.activatePoint, 'ctrl+shift+u');
    });
  });

  describe('parseShortcutInputEvent', () => {
    it('returns null for modifier-only and tab keys', () => {
      assert.isNull(
        parseShortcutInputEvent(
          new KeyboardEvent('keydown', { key: 'Shift', shiftKey: true }),
        ),
      );
      assert.isNull(
        parseShortcutInputEvent(new KeyboardEvent('keydown', { key: 'Tab' })),
      );
    });

    it('builds normalized shortcuts with modifiers', () => {
      const parsed = parseShortcutInputEvent(
        new KeyboardEvent('keydown', {
          key: 'A',
          ctrlKey: true,
          shiftKey: true,
        }),
      );

      assert.deepEqual(parsed, {
        shortcut: 'ctrl+shift+a',
        shouldClear: false,
      });
    });

    it('builds normalized shortcuts with meta/alt modifiers', () => {
      const parsed = parseShortcutInputEvent(
        new KeyboardEvent('keydown', {
          key: 'K',
          metaKey: true,
          altKey: true,
        }),
      );

      assert.deepEqual(parsed, {
        shortcut: 'meta+alt+k',
        shouldClear: false,
      });
    });

    it('marks delete/backspace with no modifiers as clear actions', () => {
      const backspaceParsed = parseShortcutInputEvent(
        new KeyboardEvent('keydown', { key: 'Backspace' }),
      );
      const deleteParsed = parseShortcutInputEvent(
        new KeyboardEvent('keydown', { key: 'Delete' }),
      );

      assert.deepEqual(backspaceParsed, {
        shortcut: 'Backspace',
        shouldClear: true,
      });
      assert.deepEqual(deleteParsed, { shortcut: 'Delete', shouldClear: true });
    });
  });

  describe('subscribeShortcuts', () => {
    it('notifies listeners and stops after unsubscribe', () => {
      const listener = sinon.stub();
      const unsubscribe = subscribeShortcuts(listener);

      assert.calledOnce(listener);
      setShortcut('applyUpdates', 'x');
      assert.calledTwice(listener);

      unsubscribe();
      setShortcut('applyUpdates', 'y');

      assert.calledTwice(listener);
    });
  });
});
