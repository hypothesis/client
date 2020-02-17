import classnames from 'classnames';
import { createElement } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import propTypes from 'prop-types';

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

  const [isActive, setActive] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timeout = setTimeout(() => setActive(true), 1);
      return () => clearTimeout(timeout);
    } else {
      setActive(false);
      return null;
    }
  }, [isVisible]);

  // nb. The adder is hidden using the `visibility` property rather than `display`
  // so that we can compute its size in order to position it before display.
  return (
    <hypothesis-adder-toolbar
      class={classnames('annotator-adder', {
        'annotator-adder--arrow-down': arrowDirection === 'down',
        'annotator-adder--arrow-up': arrowDirection === 'up',
        'is-active': isActive,
      })}
      style={{ visibility: isVisible ? 'visible' : 'hidden' }}
    >
      <hypothesis-adder-actions className="annotator-adder-actions">
        <button
          className="annotator-adder-actions__button h-icon-annotate"
          onClick={e => handleCommand(e, 'annotate')}
        >
          <span className="annotator-adder-actions__label">Annotate</span>
        </button>
        <button
          className="annotator-adder-actions__button h-icon-highlight"
          onClick={e => handleCommand(e, 'highlight')}
        >
          <span className="annotator-adder-actions__label">Highlight</span>
        </button>
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
