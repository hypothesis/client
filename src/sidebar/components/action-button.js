'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');

const SvgIcon = require('./svg-icon');

/**
 * A button, with (required) text label and an (optional) icon
 */
function ActionButton({
  icon = '',
  isActive = false,
  isPrimary = false,
  label,
  onClick = () => null,
  useCompactStyle = false,
}) {
  return (
    <button
      className={classnames('action-button', {
        'action-button--compact': useCompactStyle,
        'action-button--primary': isPrimary,
        'is-active': isActive,
      })}
      onClick={onClick}
      aria-pressed={isActive}
      title={label}
    >
      {icon && (
        <SvgIcon
          name={icon}
          className={classnames('action-button__icon', {
            'action-button__icon--compact': useCompactStyle,
            'action-button__icon--primary': isPrimary,
          })}
        />
      )}
      <span className="action-button__label">{label}</span>
    </button>
  );
}

ActionButton.propTypes = {
  /** The name of the SVGIcon to render */
  icon: propTypes.string,
  /** Is this button currently in an "active" or in an "on" state? */
  isActive: propTypes.bool,
  /**
   * Does this button represent the "primary" action available? If so,
   * differentiating styles will be applied.
   */
  isPrimary: propTypes.bool,
  /** a label used for the `title` and `aria-label` attributes */
  label: propTypes.string.isRequired,
  /** callback for button clicks */
  onClick: propTypes.func,
  /** Allows a variant of this type of button that takes up less space */
  useCompactStyle: propTypes.bool,
};

module.exports = ActionButton;
