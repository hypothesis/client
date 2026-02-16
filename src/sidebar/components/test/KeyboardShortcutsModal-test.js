import { mockImportedComponents } from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import KeyboardShortcutsModal, { $imports } from '../KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  let fakeSession;
  let fakeStore;
  let fakeShortcuts;
  let fakeShortcutDefinitions;
  let fakeGetAllShortcuts;
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

  const findButton = (wrapper, testId) =>
    wrapper.find(`[data-testid="${testId}"]`).first();
  const findShortcutInput = (wrapper, id) =>
    wrapper.find(`[data-testid="shortcut-input-${id}"]`).first();

  beforeEach(() => {
    fakeSession = {
      updateShortcutPreferences: sinon.stub(),
    };
    fakeShortcuts = {
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
    fakeParseShortcutInputEvent = sinon.stub();
    fakeResetShortcuts = sinon.stub();
    fakeSetAllShortcuts = sinon.stub();
    fakeSetShortcut = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
      '../../shared/shortcut-config': {
        getAllShortcuts: fakeGetAllShortcuts,
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

    const saveButton = findButton(wrapper, 'save-shortcuts-button');
    saveButton.props().onClick();

    assert.calledWith(
      fakeSession.updateShortcutPreferences,
      fakeGetAllShortcuts.returnValues[0],
    );
  });

  it('calls onSave and clears save error when save succeeds', async () => {
    const onClose = sinon.stub();

    const wrapper = createComponent({ onClose });

    const saveButton = findButton(wrapper, 'save-shortcuts-button');
    await saveButton.props().onClick();

    assert.calledWith(fakeSession.updateShortcutPreferences, fakeShortcuts);
    assert.called(onClose);
    assert.isFalse(wrapper.exists('[data-testid="save-shortcuts-error"]'));
  });

  it('shows an error and disables saving when duplicates exist', () => {
    fakeShortcuts = {
      applyUpdates: 'a',
      annotateSelection: 'a',
    };

    const wrapper = createComponent();

    assert.isTrue(wrapper.exists('[data-testid="duplicate-shortcuts-error"]'));
    const saveButton = findButton(wrapper, 'save-shortcuts-button');
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

    const resetButton = findButton(wrapper, 'reset-shortcuts-button');
    resetButton.props().onClick();

    assert.called(fakeResetShortcuts);
    assert.calledWith(fakeSession.updateShortcutPreferences, {});
  });

  it('does not save shortcuts when duplicates exist', () => {
    fakeShortcuts = {
      applyUpdates: 'a',
      annotateSelection: 'a',
    };

    const wrapper = createComponent();

    const saveButton = findButton(wrapper, 'save-shortcuts-button');
    saveButton.props().onClick();

    assert.notCalled(fakeSession.updateShortcutPreferences);
  });

  it('shows an error message when saving shortcuts fails', async () => {
    fakeSession.updateShortcutPreferences.rejects(
      new Error('Error saving shortcuts'),
    );

    const wrapper = createComponent();

    const saveButton = findButton(wrapper, 'save-shortcuts-button');
    await saveButton.props().onClick();

    wrapper.update();
    assert.isTrue(wrapper.exists('[data-testid="save-shortcuts-error"]'));
  });

  it('shows an error message when resetting shortcuts fails', async () => {
    fakeSession.updateShortcutPreferences.rejects(
      new Error('Error resetting shortcuts'),
    );

    const wrapper = createComponent();

    const resetButton = findButton(wrapper, 'reset-shortcuts-button');
    await resetButton.props().onClick();

    wrapper.update();
    assert.isTrue(wrapper.exists('[data-testid="save-shortcuts-error"]'));
  });

  it('clears save errors when updating a shortcut', async () => {
    fakeSession.updateShortcutPreferences.rejects(
      new Error('Error saving shortcuts'),
    );
    fakeParseShortcutInputEvent.returns({
      shortcut: 'ctrl+k',
      shouldClear: false,
    });

    const wrapper = createComponent();

    const saveButton = findButton(wrapper, 'save-shortcuts-button');
    await saveButton.props().onClick();
    wrapper.update();
    assert.isTrue(wrapper.exists('[data-testid="save-shortcuts-error"]'));

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    findShortcutInput(wrapper, 'applyUpdates').props().onKeyDown(event);

    wrapper.update();
    assert.isFalse(wrapper.exists('[data-testid="save-shortcuts-error"]'));
  });

  it('renders shortcut labels and descriptions when provided', () => {
    fakeShortcutDefinitions.splice(
      0,
      fakeShortcutDefinitions.length,
      {
        id: 'applyUpdates',
        label: 'Apply new updates',
        description: 'Apply any new updates in the thread',
        group: 'Sidebar',
      },
      {
        id: 'annotateSelection',
        label: 'Annotate selection',
        group: 'Annotator',
      },
    );

    const wrapper = createComponent();

    const label = wrapper.find('[data-testid="shortcut-label-applyUpdates"]');
    assert.equal(label.text(), 'Apply new updates');
    const description = wrapper.find(
      '[data-testid="shortcut-description-applyUpdates"]',
    );
    assert.equal(description.length, 1);
    assert.equal(description.text(), 'Apply any new updates in the thread');
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

    const input = findShortcutInput(wrapper, 'applyUpdates');
    input.props().onKeyDown(new KeyboardEvent('keydown', { key: 'x' }));

    const cancelButton = findButton(wrapper, 'cancel-shortcuts-button');
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

    findShortcutInput(wrapper, 'applyUpdates').props().onKeyDown(event);

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

    findShortcutInput(wrapper, 'applyUpdates').props().onKeyDown(event);

    assert.called(event.preventDefault);
    assert.called(event.stopPropagation);
  });

  it('ignores keydown events that do not parse', () => {
    fakeParseShortcutInputEvent.returns(null);

    const wrapper = createComponent();

    findShortcutInput(wrapper, 'applyUpdates')
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

    findShortcutInput(wrapper, 'applyUpdates')
      .props()
      .onKeyDown(new KeyboardEvent('keydown', { key: 'Backspace' }));

    assert.calledWith(fakeSetShortcut, 'applyUpdates', null);
  });
});
