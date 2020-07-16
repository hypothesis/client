import { createElement } from 'preact';

import useStore from '../store/use-store';

/**
 * Render a control to interact with any focused "mode" in the sidebar.
 * Currently only a user-focus mode is supported but this could be broadened
 * and abstracted if needed. Allow user to toggle in and out of the focus "mode."
 */
export default function FocusedModeHeader() {
  const toggleFocusMode = useStore(store => store.toggleFocusMode);
  const selectors = useStore(store => ({
    focusModeActive: store.focusModeActive(),
    focusModeConfigured: store.focusModeConfigured(),
    focusModeUserPrettyName: store.focusModeUserPrettyName(),
  }));

  // Nothing to do here for now if we're not focused on a user
  if (!selectors.focusModeConfigured) {
    return null;
  }

  const filterStatus = (
    <div className="focused-mode-header__filter-status">
      {selectors.focusModeActive ? (
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
    if (selectors.focusModeActive) {
      return 'Show all';
    } else {
      return `Show only ${selectors.focusModeUserPrettyName}`;
    }
  })();

  return (
    <div className="focused-mode-header">
      {filterStatus}
      <button
        onClick={() => toggleFocusMode()}
        className="focused-mode-header__btn"
      >
        {buttonText}
      </button>
    </div>
  );
}

FocusedModeHeader.propTypes = {};
