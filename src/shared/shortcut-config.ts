import { useEffect, useState } from 'preact/hooks';

export type ShortcutId =
  | 'applyUpdates'
  | 'openSearch'
  | 'annotateSelection'
  | 'highlightSelection'
  | 'toggleHighlights'
  | 'showSelection'
  | 'hideAdder';

export type ShortcutValue = string | null;

export type ShortcutMap = Record<ShortcutId, ShortcutValue>;

export type ShortcutDefinition = {
  id: ShortcutId;
  label: string;
  /** Optional extra explanation */
  description?: string;
  /** Grouping label for the keyboard shortcuts modal */
  group: 'Sidebar' | 'Search' | 'Annotator';
};

// Default shortcuts
const defaultShortcuts: ShortcutMap = {
  applyUpdates: 'l',
  openSearch: '/',
  annotateSelection: 'a',
  highlightSelection: 'h',
  toggleHighlights: 'ctrl+shift+h',
  showSelection: 's',
  hideAdder: 'Escape',
};

// Shortcut groups that are allowed to share the same key.
export const repeatableShortcutGroups: ShortcutId[][] = [];

let currentShortcuts: ShortcutMap = { ...defaultShortcuts };

type Listener = (map: ShortcutMap) => void;

const listeners = new Set<Listener>();

function normalizeShortcutMap(
  map: Partial<Record<string, unknown>>,
): Partial<ShortcutMap> {
  const normalized: Record<string, string | null> = {};
  Object.keys(defaultShortcuts).forEach((id: string) => {
    const value = map[id];

    if (typeof value === 'string' || value === null) {
      normalized[id] = value;
    }
  });

  return normalized;
}

function notifyListeners() {
  const snapshot = { ...currentShortcuts };
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function getAllShortcuts(): ShortcutMap {
  return { ...currentShortcuts };
}

export function getDefaultShortcuts(): ShortcutMap {
  return { ...defaultShortcuts };
}

export function setShortcut(id: ShortcutId, value: ShortcutValue) {
  currentShortcuts = {
    ...currentShortcuts,
    [id]: value && value.trim() !== '' ? value.trim() : null,
  };
  notifyListeners();
}

export function setAllShortcuts(map: Partial<ShortcutMap>) {
  currentShortcuts = {
    ...defaultShortcuts,
    ...normalizeShortcutMap(map),
  };
  notifyListeners();
}

export function resetShortcuts() {
  currentShortcuts = { ...defaultShortcuts };
  notifyListeners();
}

export function parseShortcutInputEvent(
  event: KeyboardEvent,
): { shortcut: string; shouldClear: boolean } | null {
  const { key } = event;

  if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
    return null;
  }

  if (key === 'Tab') {
    return null;
  }

  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push('ctrl');
  }
  if (event.metaKey) {
    parts.push('meta');
  }
  if (event.altKey) {
    parts.push('alt');
  }
  if (event.shiftKey) {
    parts.push('shift');
  }

  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
  parts.push(normalizedKey);

  const shortcut = parts.join('+');

  const shouldClear =
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey &&
    (event.key === 'Backspace' || event.key === 'Delete');

  return { shortcut, shouldClear };
}

export function subscribeShortcuts(listener: Listener): () => void {
  listeners.add(listener);
  listener({ ...currentShortcuts });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Hook that returns the current shortcut map and updates whenever any shortcut changes.
 */
export function useShortcutsConfig(): ShortcutMap {
  const [map, setMap] = useState<ShortcutMap>(() => getAllShortcuts());

  useEffect(() => {
    return subscribeShortcuts(setMap);
  }, []);

  return map;
}

/**
 * Metadata about shortcuts for display in the keyboard shortcuts modal.
 */
export const shortcutDefinitions: ShortcutDefinition[] = [
  {
    id: 'applyUpdates',
    label: 'Load new updates',
    description: 'Loads new/updated annotations in the Sidebar.',
    group: 'Sidebar',
  },
  {
    id: 'openSearch',
    label: 'Search',
    description: 'Opens the Search filter.',
    group: 'Search',
  },
  {
    id: 'annotateSelection',
    label: 'Create annotation',
    description: 'Create annotation at selected text.',
    group: 'Annotator',
  },
  {
    id: 'highlightSelection',
    label: 'Create Highlight',
    description: 'Create Highlight at selected text.',
    group: 'Annotator',
  },
  {
    id: 'toggleHighlights',
    label: 'Show/hide highlights',
    description: 'Turns the highlights over selected text on and off.',
    group: 'Annotator',
  },
  {
    id: 'showSelection',
    label: 'Show anchored annotations',
    description: 'Moves focus to the annotation Card in the Sidebar.',
    group: 'Annotator',
  },
  {
    id: 'hideAdder',
    label: 'Close the Adder',
    description: 'Closes the Adder when it is open.',
    group: 'Annotator',
  },
];
