import { createElement } from 'preact';

import useStore from '../store/use-store';

/**
 * Render a control to interact with any focused "mode" in the sidebar.
 * Currently only a user-focus mode is supported but this could be broadened
 * and abstracted if needed. Allow user to toggle in and out of the focus "mode."
 */
export default function FocusedModeHeader() {
  const actions = useStore(store => ({
    setFocusModeFocused: store.setFocusModeFocused,
  }));
  const selectors = useStore(store => ({
    focusModeFocused: store.focusModeFocused(),
    focusModeHasUser: store.focusModeHasUser(),
    focusModeUserPrettyName: store.focusModeUserPrettyName(),
  }));

  // Nothing to do here for now if we're not focused on a user
  if (!selectors.focusModeHasUser) {
    return null;
  }

  const toggleFocusedMode = () => {
    actions.setFocusModeFocused(!selectors.focusModeFocused);
  };

  const filterStatus = (
    <div className="focused-mode-header__filter-status">
      {selectors.focusModeFocused ? (
        <span>
          Showing <strong>{selectors.focusModeUserPrettyName}</strong> only
        </span>
      ) : (
        <span>
          Showing <strong>all</strong>
        </span>
      )}
    </div>
  );

  const buttonText = (() => {
    if (selectors.focusModeFocused) {
      return 'Show all';
    } else {
      return `Show only ${selectors.focusModeUserPrettyName}`;
    }
  })();

  return (
    <div className="focused-mode-header">
      {filterStatus}
      <button onClick={toggleFocusedMode} className="focused-mode-header__btn">
        {buttonText}
      </button>
    </div>
  );
}

FocusedModeHeader.propTypes = {};
