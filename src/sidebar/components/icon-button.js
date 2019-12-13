'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');

const SvgIcon = require('./svg-icon');

/**
 * A simple icon-only button
 */
function IconButton({
  className = '',
  icon,
  isActive = false,
  title,
  onClick = () => null,
}) {
  return (
    <button
      className={classnames('icon-button', className, {
        'is-active': isActive,
      })}
      onClick={onClick}
      aria-pressed={isActive}
      title={title}
    >
      <SvgIcon name={icon} className="icon-button__icon" />
    </button>
  );
}

IconButton.propTypes = {
  /** Optional additional class(es) to apply to the component element */
  className: propTypes.string,
  /** The name of the SVGIcon to render */
  icon: propTypes.string.isRequired,
  /** Is this button currently in an "active" or "on" state? */
  isActive: propTypes.bool,
  /** a value used for the `title` and `aria-label` attributes */
  title: propTypes.string.isRequired,
  /** optional callback for clicks */
  onClick: propTypes.func,
};

module.exports = IconButton;
