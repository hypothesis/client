import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import KeyboardShortcutsModal, { $imports } from '../KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  let fakeSession;
  let fakeStore;
  let fakeShortcuts;
  let fakeDefaultShortcuts;
  let fakeShortcutDefinitions;
  let fakeGetAllShortcuts;
  let fakeGetDefaultShortcuts;
  let fakeParseShortcutInputEvent;
  let fakeRepeatableShortcutGroups;
  let fakeResetShortcuts;
  let fakeSetAllShortcuts;
  let fakeSetShortcut;
  const createComponent = props => {
    return mount(
      <KeyboardShortcutsModal
        open={true}
        onClose={sinon.stub()}
        session={fakeSession}
        {...props}
      />,
      { connected: true },
    );
  };

  const findButton = (wrapper, label) =>
    wrapper.find('Button').filterWhere(node => node.props().children === label);
  const findShortcutInput = (wrapper, label) =>
    wrapper
      .find('Input')
      .filterWhere(node => node.prop('aria-label') === `Shortcut for ${label}`);

  beforeEach(() => {
    fakeSession = {
      updateShortcutPreferences: sinon.stub(),
    };
    fakeShortcuts = {
      applyUpdates: 'l',
      annotateSelection: 'a',
    };

    fakeDefaultShortcuts = {
      applyUpdates: 'l',
      annotateSelection: 'a',
    };

    fakeShortcutDefinitions = [
      {
        id: 'applyUpdates',
        label: 'Apply new updates',
        group: 'Sidebar',
      },
      {
        id: 'annotateSelection',
        label: 'Annotate selection',
        group: 'Annotator',
      },
    ];

    fakeRepeatableShortcutGroups = [];

    fakeStore = {
      hasFetchedProfile: sinon.stub().returns(false),
      profile: sinon.stub().returns({}),
    };

    fakeGetAllShortcuts = sinon.stub().returns(fakeShortcuts);
    fakeGetDefaultShortcuts = sinon.stub().returns(fakeDefaultShortcuts);
    fakeParseShortcutInputEvent = sinon.stub();
    fakeResetShortcuts = sinon.stub();
    fakeSetAllShortcuts = sinon.stub();
    fakeSetShortcut = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      '../../shared/shortcut-config': {
        getAllShortcuts: fakeGetAllShortcuts,
        getDefaultShortcuts: fakeGetDefaultShortcuts,
        parseShortcutInputEvent: fakeParseShortcutInputEvent,
        repeatableShortcutGroups: fakeRepeatableShortcutGroups,
        resetShortcuts: fakeResetShortcuts,
        setAllShortcuts: fakeSetAllShortcuts,
        setShortcut: fakeSetShortcut,
        shortcutDefinitions: fakeShortcutDefinitions,
        useShortcutsConfig: () => fakeShortcuts,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('saves shortcuts when there are no duplicates', () => {
    const wrapper = createComponent();

    const saveButton = findButton(wrapper, 'Save');
    saveButton.props().onClick();

    assert.calledWith(
      fakeSession.updateShortcutPreferences,
      fakeGetAllShortcuts.returnValues[0],
    );
  });

  it('shows an error and disables saving when duplicates exist', () => {
    fakeShortcuts = {
      applyUpdates: 'a',
      annotateSelection: 'a',
    };

    const wrapper = createComponent();

    assert.isTrue(wrapper.exists('[data-testid="duplicate-shortcuts-error"]'));
    const saveButton = findButton(wrapper, 'Save');
    assert.isTrue(saveButton.prop('disabled'));
  });

  it('allows duplicates that are explicitly repeatable', () => {
    fakeShortcuts = {
      applyUpdates: 'a',
      annotateSelection: 'a',
    };
    fakeRepeatableShortcutGroups.push(['applyUpdates', 'annotateSelection']);

    const wrapper = createComponent();

    assert.isFalse(wrapper.exists('[data-testid="duplicate-shortcuts-error"]'));
  });

  it('resets shortcuts to defaults', () => {
    const wrapper = createComponent();

    const resetButton = findButton(wrapper, 'Reset all shortcuts to defaults');
    resetButton.props().onClick();

    assert.called(fakeResetShortcuts);
    assert.calledWith(
      fakeSession.updateShortcutPreferences,
      fakeGetDefaultShortcuts.returnValues[0],
    );
  });

  it('does not save shortcuts when duplicates exist', () => {
    fakeShortcuts = {
      applyUpdates: 'a',
      annotateSelection: 'a',
    };

    const wrapper = createComponent();

    const saveButton = findButton(wrapper, 'Save');
    saveButton.props().onClick();

    assert.notCalled(fakeSession.updateShortcutPreferences);
  });

  it('shows an error message when saving shortcuts fails', async () => {
    fakeSession.updateShortcutPreferences.rejects(
      new Error('Error saving shortcuts'),
    );

    const wrapper = createComponent();

    const saveButton = findButton(wrapper, 'Save');
    await saveButton.props().onClick();

    wrapper.update();
    assert.isTrue(wrapper.exists('[data-testid="save-shortcuts-error"]'));
  });

  it('restores profile shortcuts on close', () => {
    const onClose = sinon.stub();
    const profileShortcuts = { applyUpdates: 'p' };
    fakeStore.hasFetchedProfile.returns(true);
    fakeStore.profile.returns({
      preferences: { shortcuts_preferences: profileShortcuts },
    });
    fakeParseShortcutInputEvent.returns({
      shortcut: 'x',
      shouldClear: false,
    });

    const wrapper = createComponent({ onClose });

    const input = findShortcutInput(wrapper, 'Apply new updates');
    input.props().onKeyDown(new KeyboardEvent('keydown', { key: 'x' }));

    const cancelButton = findButton(wrapper, 'Cancel');
    cancelButton.props().onClick();

    assert.calledWith(fakeSetShortcut, 'applyUpdates', 'x');
    assert.calledWith(fakeSetAllShortcuts, profileShortcuts);
    assert.called(onClose);
  });

  it('closes without restoring shortcuts when no profile fetched', () => {
    const onClose = sinon.stub();
    const wrapper = createComponent({ onClose });

    wrapper.find('IconButton').props().onClick();

    assert.notCalled(fakeSetAllShortcuts);
    assert.called(onClose);
  });

  it('updates a shortcut with the parsed key combo', () => {
    const parsedShortcut = {
      shortcut: 'ctrl+k',
      shouldClear: false,
    };
    fakeParseShortcutInputEvent.returns(parsedShortcut);

    const wrapper = createComponent();
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });

    findShortcutInput(wrapper, 'Apply new updates').props().onKeyDown(event);

    assert.calledWith(fakeParseShortcutInputEvent, event);
    assert.calledWith(fakeSetShortcut, 'applyUpdates', parsedShortcut.shortcut);
  });

  it('prevents default keyboard handling when input parses', () => {
    fakeParseShortcutInputEvent.returns({
      shortcut: 'ctrl+k',
      shouldClear: false,
    });

    const wrapper = createComponent();
    const event = {
      preventDefault: sinon.stub(),
      stopPropagation: sinon.stub(),
    };

    findShortcutInput(wrapper, 'Apply new updates').props().onKeyDown(event);

    assert.called(event.preventDefault);
    assert.called(event.stopPropagation);
  });

  it('ignores keydown events that do not parse', () => {
    fakeParseShortcutInputEvent.returns(null);

    const wrapper = createComponent();

    findShortcutInput(wrapper, 'Apply new updates')
      .props()
      .onKeyDown(new KeyboardEvent('keydown', { key: 'Shift' }));

    assert.notCalled(fakeSetShortcut);
  });

  it('clears a shortcut when requested', () => {
    fakeParseShortcutInputEvent.returns({
      shortcut: 'Backspace',
      shouldClear: true,
    });

    const wrapper = createComponent();

    findShortcutInput(wrapper, 'Apply new updates')
      .props()
      .onKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

    assert.calledWith(fakeSetShortcut, 'applyUpdates', null);
  });
});
