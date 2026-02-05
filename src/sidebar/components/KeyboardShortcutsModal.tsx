import {
  Button,
  CancelIcon,
  IconButton,
  Input,
} from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useMemo, useState } from 'preact/hooks';

import ModalDialog from '../../annotator/components/ModalDialog';
import {
  getAllShortcuts,
  parseShortcutInputEvent,
  repeatableShortcutGroups,
  resetShortcuts,
  setAllShortcuts,
  setShortcut,
  shortcutDefinitions,
  useShortcutsConfig,
  type ShortcutDefinition,
  type ShortcutId,
} from '../../shared/shortcut-config';
import { withServices } from '../service-context';
import type { SessionService } from '../services/session';
import { useSidebarStore } from '../store';

type ShortcutGroups = Record<string, typeof shortcutDefinitions>;
type ShortcutsConfig = ReturnType<typeof useShortcutsConfig>;

type ShortcutHeaderProps = {
  handleClose: () => void;
};

function ShortcutHeader({ handleClose }: ShortcutHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <h2 className="text-lg font-bold">Keyboard shortcuts</h2>
      <IconButton
        title="Close keyboard shortcuts"
        onClick={handleClose}
        variant="dark"
        classes={classnames('!bg-transparent enabled:hover:!bg-grey-3')}
      >
        <CancelIcon className="w-4 h-4" />
      </IconButton>
    </div>
  );
}

type ShortcutBodyProps = {
  handleShortcutInputKeyDown: (id: ShortcutId, event: KeyboardEvent) => void;
  shortcutsKeyValue: ShortcutsConfig;
  duplicateShortcutsMessage: string | null;
  saveError: string | null;
};

function ShortcutBody({
  handleShortcutInputKeyDown,
  shortcutsKeyValue,
  duplicateShortcutsMessage,
  saveError,
}: ShortcutBodyProps) {
  // Group shortcuts for display
  const groupShortcuts = shortcutDefinitions.reduce<ShortcutGroups>(
    (accumulator, definition) => {
      accumulator[definition.group] ??= [];
      accumulator[definition.group].push(definition);
      return accumulator;
    },
    {},
  );

  return (
    <div className="px-4 pt-3 pb-4 space-y-4 max-h-[70vh] overflow-y-auto">
      <p className="text-sm text-grey-7">
        Customize your keyboard shortcuts by typing a new keystroke. Clear a
        field to disable that shortcut.
      </p>
      {duplicateShortcutsMessage && (
        <p
          className="text-xs text-red-dark"
          data-testid="duplicate-shortcuts-error"
        >
          {duplicateShortcutsMessage}
        </p>
      )}
      {saveError && (
        <p className="text-xs text-red-dark" data-testid="save-shortcuts-error">
          {saveError}
        </p>
      )}

      {Object.entries(groupShortcuts).map(
        ([groupName, shortcutsDefinitions]) => (
          <div key={groupName} className="space-y-2">
            <h3 className="text-sm font-semibold text-grey-7">{groupName}</h3>
            <div className="space-y-2">
              {shortcutsDefinitions.map(({ id, label, description }) => (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      data-testid={`shortcut-label-${id}`}
                    >
                      {label}
                    </div>
                    {description && (
                      <div
                        className="text-xs text-grey-6"
                        data-testid={`shortcut-description-${id}`}
                      >
                        {description}
                      </div>
                    )}
                  </div>
                  <div className="w-32">
                    <Input
                      aria-label={`Shortcut for ${label}`}
                      data-testid={`shortcut-input-${id}`}
                      value={shortcutsKeyValue[id] ?? ''}
                      onKeyDown={(e: KeyboardEvent) =>
                        handleShortcutInputKeyDown(id, e)
                      }
                      placeholder="Press keys"
                      classes="text-sm"
                      readOnly
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

type ShortcutActionsProps = {
  duplicateShortcutsMessage: string | null;
  handleClose: () => void;
  session: SessionService;
  onSaveError: (message: string | null) => void;
};

function ShortcutActions({
  duplicateShortcutsMessage,
  handleClose,
  session,
  onSaveError,
}: ShortcutActionsProps) {
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row items-center sm:justify-between">
      <Button
        onClick={async () => {
          resetShortcuts();
          try {
            await session.updateShortcutPreferences({});
            onSaveError(null);
          } catch {
            onSaveError('Unable to save keyboard shortcuts');
          }
        }}
        variant="custom"
        classes="text-sm text-grey-7 hover:text-grey-9 w-min"
        data-testid="reset-shortcuts-button"
      >
        Reset all shortcuts to defaults
      </Button>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap justify-center">
        <Button
          onClick={async () => {
            if (duplicateShortcutsMessage) {
              return;
            }
            try {
              await session.updateShortcutPreferences(getAllShortcuts());
              onSaveError(null);
            } catch {
              onSaveError('Unable to save keyboard shortcuts');
            }
          }}
          variant="primary"
          disabled={!!duplicateShortcutsMessage}
          classes="w-min"
          data-testid="save-shortcuts-button"
        >
          Save
        </Button>
        <Button
          onClick={handleClose}
          variant="custom"
          classes="text-sm text-grey-7 hover:text-grey-9 w-min"
          data-testid="cancel-shortcuts-button"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

type KeyboardShortcutsModalProps = {
  open: boolean;
  onClose: () => void;
  session: SessionService;
};

function KeyboardShortcutsModal({
  open,
  onClose,
  session,
}: KeyboardShortcutsModalProps) {
  const shortcuts = useShortcutsConfig();
  const store = useSidebarStore();
  const hasFetchedProfile = store.hasFetchedProfile();
  const profile = store.profile();
  const [saveError, setSaveError] = useState<string | null>(null);

  const restoreProfileShortcuts = () => {
    if (!hasFetchedProfile) {
      return;
    }
    setAllShortcuts(profile.preferences?.shortcuts_preferences ?? {});
  };

  const handleClose = () => {
    restoreProfileShortcuts();
    setSaveError(null);
    onClose();
  };

  const onChangeShortcut = (id: ShortcutId, value: string) => {
    setShortcut(id, value.trim() === '' ? null : value);
    setSaveError(null);
  };

  const handleShortcutInputKeyDown = (id: ShortcutId, event: KeyboardEvent) => {
    const parsed = parseShortcutInputEvent(event);
    if (!parsed) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    onChangeShortcut(id, parsed.shouldClear ? '' : parsed.shortcut);
  };

  const isShortcutConflict = (shortcutIds: ShortcutId[]) => {
    if (shortcutIds.length <= 1) {
      return false;
    }

    const isAllowedDuplicate = repeatableShortcutGroups.some(group =>
      shortcutIds.every(id => group.includes(id)),
    );

    return !isAllowedDuplicate;
  };

  // Returns a list of duplicate shortcuts that are not allowed to be repeated
  const duplicateShortcuts = useMemo(() => {
    // Group current shortcuts by key
    const shortcutsByKey = new Map<string, ShortcutDefinition[]>();
    shortcutDefinitions.forEach(shortcutDefinition => {
      const keyValue = shortcuts[shortcutDefinition.id]?.trim().toLowerCase();
      if (keyValue) {
        const shortcutsKeyValue = shortcutsByKey.get(keyValue) ?? [];
        shortcutsKeyValue.push(shortcutDefinition);
        shortcutsByKey.set(keyValue, shortcutsKeyValue);
      }
    });

    return [...shortcutsByKey.entries()].filter(([, shortcuts]) => {
      // Keep only duplicate groups that are not allowed to be repeated
      return isShortcutConflict(shortcuts.map(({ id }) => id));
    });
  }, [shortcuts]);

  const duplicateShortcutsMessage =
    duplicateShortcuts.length > 0
      ? `Each keystroke can only be used once. Resolve duplicate use of ${duplicateShortcuts
          .map(
            ([shortcutKeyValue, duplicateShortcuts]) =>
              `"${shortcutKeyValue}". Currently assigned to: ${duplicateShortcuts.map(({ label }) => label).join(', ')}`,
          )
          .join('; ')}.`
      : null;

  return (
    <ModalDialog
      closed={!open}
      onClose={handleClose}
      aria-label="Keyboard shortcuts"
      data-testid="keyboard-shortcuts-modal"
      className="m-0 bg-transparent"
    >
      <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
        <div className="relative w-full sm:h-auto sm:max-w-xl bg-white rounded shadow-lg">
          <ShortcutHeader handleClose={handleClose} />

          <ShortcutBody
            duplicateShortcutsMessage={duplicateShortcutsMessage}
            handleShortcutInputKeyDown={handleShortcutInputKeyDown}
            shortcutsKeyValue={shortcuts}
            saveError={saveError}
          />

          <ShortcutActions
            duplicateShortcutsMessage={duplicateShortcutsMessage}
            handleClose={handleClose}
            session={session}
            onSaveError={setSaveError}
          />
        </div>
      </div>
    </ModalDialog>
  );
}

export default withServices(KeyboardShortcutsModal, ['session']);
