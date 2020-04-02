import classnames from 'classnames';
import { createElement } from 'preact';
import propTypes from 'prop-types';

import { useShortcut } from '../../shared/shortcut';
import SvgIcon from '../../shared/components/svg-icon';

function ToolbarButton({ icon, label, onClick, shortcut }) {
  useShortcut(shortcut, onClick);

  const title = shortcut ? `${label} (${shortcut})` : label;

  return (
    <button
      className="annotator-adder-actions__button"
      onClick={onClick}
      title={title}
    >
      <SvgIcon name={icon} />
      <span className="annotator-adder-actions__label">{label}</span>
    </button>
  );
}

ToolbarButton.propTypes = {
  icon: propTypes.string.isRequired,
  label: propTypes.string.isRequired,
  onClick: propTypes.func.isRequired,
  shortcut: propTypes.string,
};

/**
 * The toolbar that is displayed above selected text in the document providing
 * options to create annotations or highlights.
 */
export default function AdderToolbar({ arrowDirection, isVisible, onCommand }) {
  const handleCommand = (event, command) => {
    event.preventDefault();
    event.stopPropagation();

    onCommand(command);
  };

  // Since the selection toolbar is only shown when there is a selection
  // of static text, we can use a plain key without any modifier as
  // the shortcut. This avoids conflicts with browser/OS shortcuts.
  const annotateShortcut = isVisible ? 'a' : null;
  const highlightShortcut = isVisible ? 'h' : null;

  // nb. The adder is hidden using the `visibility` property rather than `display`
  // so that we can compute its size in order to position it before display.
  return (
    <hypothesis-adder-toolbar
      class={classnames('annotator-adder', {
        'annotator-adder--arrow-down': arrowDirection === 'down',
        'annotator-adder--arrow-up': arrowDirection === 'up',
        'is-active': isVisible,
      })}
      style={{ visibility: isVisible ? 'visible' : 'hidden' }}
    >
      <hypothesis-adder-actions className="annotator-adder-actions">
        <ToolbarButton
          icon="annotate"
          onClick={e => handleCommand(e, 'annotate')}
          label="Annotate"
          shortcut={annotateShortcut}
        />
        <ToolbarButton
          icon="highlight"
          onClick={e => handleCommand(e, 'highlight')}
          label="Highlight"
          shortcut={highlightShortcut}
        />
      </hypothesis-adder-actions>
    </hypothesis-adder-toolbar>
  );
}

AdderToolbar.propTypes = {
  /**
   * Whether the arrow pointing out of the toolbar towards the selected text
   * should appear above the toolbar pointing Up or below the toolbar pointing
   * Down.
   */
  arrowDirection: propTypes.oneOf(['up', 'down']).isRequired,

  /**
   * Whether to show the toolbar or not.
   */
  isVisible: propTypes.bool.isRequired,

  /**
   * Callback invoked with the name ("annotate", "highlight") of the selected
   * command when a toolbar command is clicked.
   */
  onCommand: propTypes.func.isRequired,
};
