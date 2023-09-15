import { useEffect } from 'preact/hooks';

/**
 * Bit flags indicating modifiers required by a shortcut or pressed in a key event.
 */
const modifiers = {
  alt: 1,
  ctrl: 2,
  meta: 4,
  shift: 8,
} as Record<string, number>;

/**
 * Match a `shortcut` key sequence against a keydown event.
 *
 * A shortcut key sequence is a string of "+"-separated keyboard modifiers and
 * keys. The list may contain zero or more modifiers and must contain exactly
 * one non-modifier key. The key and modifier names are case-insensitive.
 * For example "Ctrl+Enter", "shift+a".
 *
 * Key names are matched against {@link KeyboardEvent.key}. Be aware that this
 * property is affected by the modifiers for certain keys. For example on a US
 * QWERTY keyboard, "Shift+1" would not match any event because the key value
 * would be "!" instead. See also https://github.com/w3c/uievents/issues/247.
 */
export function matchShortcut(event: KeyboardEvent, shortcut: string): boolean {
  // Work around an issue where Chrome autofill can dispatch "keydown" events
  // with an argument that is not a `KeyboardEvent`.
  //
  // See https://bugs.chromium.org/p/chromium/issues/detail?id=739792.
  if (!(event instanceof KeyboardEvent)) {
    return false;
  }

  const parts = shortcut.split('+').map(p => p.toLowerCase());

  let requiredModifiers = 0;
  let requiredKey = null;

  for (const part of parts) {
    const modifierFlag = modifiers[part];
    if (modifierFlag) {
      requiredModifiers |= modifierFlag;
    } else if (requiredKey === null) {
      requiredKey = part;
    } else {
      throw new Error('Multiple non-modifier keys specified');
    }
  }

  if (!requiredKey) {
    throw new Error(`Invalid shortcut: ${shortcut}`);
  }

  const actualModifiers =
    (event.ctrlKey ? modifiers.ctrl : 0) |
    (event.metaKey ? modifiers.meta : 0) |
    (event.altKey ? modifiers.alt : 0) |
    (event.shiftKey ? modifiers.shift : 0);

  return (
    actualModifiers === requiredModifiers &&
    event.key.toLowerCase() === requiredKey
  );
}

export type ShortcutOptions = {
  /**
   * Element on which the key event listener should be installed. Defaults to
   * `document.body`.
   */
  rootElement?: HTMLElement;
};

/**
 * Install a shortcut key listener on the document.
 *
 * This can be used directly outside of a component. To use within a Preact
 * component, you probably want {@link useShortcut}.
 *
 * @param shortcut - Shortcut key sequence. See {@link matchShortcut}.
 * @param onPress - A function to call when the shortcut matches
 * @return A function that removes the shortcut
 */
export function installShortcut(
  shortcut: string,
  onPress: (e: KeyboardEvent) => void,
  {
    // We use `documentElement` as the root element rather than `document.body`
    // which is used as a root element in some other places because the body
    // element is not keyboard-focusable in XHTML documents in Safari/Chrome.
    // See https://github.com/hypothesis/client/issues/4364.
    //
    // nb. `documentElement` is non-null in TS types, but it can be null if
    // the root element is explicitly removed. We don't know how this happens,
    // but it has been observed on some ChromeOS devices. See
    // https://hypothesis.sentry.io/issues/3987992034.
    rootElement = (document.documentElement as HTMLElement | null) ?? undefined,
  }: ShortcutOptions = {},
) {
  const onKeydown = (event: KeyboardEvent) => {
    if (matchShortcut(event, shortcut)) {
      onPress(event);
    }
  };
  /* istanbul ignore next */
  if (!rootElement) {
    return () => {};
  }
  rootElement.addEventListener('keydown', onKeydown);
  return () => rootElement.removeEventListener('keydown', onKeydown);
}

/**
 * An effect hook that installs a shortcut using {@link installShortcut} and
 * removes it when the component is unmounted.
 *
 * This provides a convenient way to enable a document-level shortcut while
 * a component is mounted. This differs from adding an `onKeyDown` handler to
 * one of the component's DOM elements in that it doesn't require the component
 * to have focus.
 *
 * To conditionally disable the shortcut, set `shortcut` to `null`.
 *
 * @param shortcut - A shortcut key sequence to match or `null` to disable. See {@link matchShortcut}.
 * @param onPress - A function to call when the shortcut matches
 */
export function useShortcut(
  shortcut: string | null,
  onPress: (e: KeyboardEvent) => void,
  { rootElement }: ShortcutOptions = {},
) {
  useEffect(() => {
    if (!shortcut) {
      return undefined;
    }
    return installShortcut(shortcut, onPress, { rootElement });
  }, [shortcut, onPress, rootElement]);
}
