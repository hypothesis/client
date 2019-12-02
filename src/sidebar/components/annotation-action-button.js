'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');

const SvgIcon = require('./svg-icon');

/**
 * A simple icon-only button for actions applicable to annotations
 */
function AnnotationActionButton({
  icon,
  isActive = false,
  label,
  onClick = () => null,
}) {
  return (
    <button
      className={classnames('annotation-action-button', {
        'is-active': isActive,
      })}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <SvgIcon name={icon} className="annotation-action-button__icon" />
    </button>
  );
}

AnnotationActionButton.propTypes = {
  /** The name of the SVGIcon to render */
  icon: propTypes.string.isRequired,
  /** Is this button currently in an "active" or "on" state? */
  isActive: propTypes.bool,
  /** a label used for the `title` and `aria-label` attributes */
  label: propTypes.string.isRequired,
  /** optional callback for clicks */
  onClick: propTypes.func,
};

module.exports = AnnotationActionButton;
