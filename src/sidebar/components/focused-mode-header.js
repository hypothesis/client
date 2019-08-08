'use strict';

const { createElement } = require('preact');

const useStore = require('../store/use-store');

/**
 * Render a control to interact with any focused "mode" in the sidebar.
 * Currently only a user-focus mode is supported but this could be broadened
 * and abstracted if needed. Allow user to toggle in and out of the focus "mode."
 */
function FocusedModeHeader() {
  const store = useStore(store => ({
    actions: {
      setFocusModeFocused: store.setFocusModeFocused,
    },
    selectors: {
      focusModeFocused: store.focusModeFocused,
      focusModeUserPrettyName: store.focusModeUserPrettyName,
    },
  }));

  const toggleFocusedMode = () => {
    store.actions.setFocusModeFocused(!store.selectors.focusModeFocused());
  };

  const buttonText = () => {
    if (store.selectors.focusModeFocused()) {
      return `Annotations by ${store.selectors.focusModeUserPrettyName()}`;
    } else {
      return 'All annotations';
    }
  };

  return (
    <div className="focused-mode-header">
      <button
        onClick={toggleFocusedMode}
        className="primary-action-btn primary-action-btn--short"
        title={`Toggle to show annotations only by ${store.selectors.focusModeUserPrettyName()}`}
      >
        {buttonText()}
      </button>
    </div>
  );
}

FocusedModeHeader.propTypes = {};

module.exports = FocusedModeHeader;
