import { useEffect } from 'preact/hooks';

/** Count of components with unsaved changes. */
let unsavedCount = 0;

function preventUnload(e: BeforeUnloadEvent) {
  // `preventDefault` is the modern API for preventing unload.
  e.preventDefault();

  // Setting `returnValue` to a truthy value is a legacy method needed for
  // Firefox. Note that in Chrome, reading `returnValue` will return false
  // afterwards.
  e.returnValue = true;
}

/**
 * Return true if any active components have indicated they have unsaved changes
 * using {@link useUnsavedChanges}.
 */
export function hasUnsavedChanges() {
  return unsavedCount > 0;
}

/**
 * Hook that registers the current component as having unsaved changes that
 * would be lost in the event of a navigation.
 *
 * WARNING: As of May 2025, this works in Chrome and Firefox, but not Safari.
 * See https://github.com/hypothesis/support/issues/59#issuecomment-2886335334.
 *
 * @param hasUnsavedChanges - True if current component has unsaved changes
 * @param window_ - Test seam
 */
export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  /* istanbul ignore next - test seam */
  window_ = window,
) {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return () => {};
    }

    unsavedCount += 1;
    if (unsavedCount === 1) {
      window_.addEventListener('beforeunload', preventUnload);
    }
    return () => {
      unsavedCount -= 1;
      if (unsavedCount === 0) {
        window_.removeEventListener('beforeunload', preventUnload);
      }
    };
  }, [hasUnsavedChanges, window_]);
}
