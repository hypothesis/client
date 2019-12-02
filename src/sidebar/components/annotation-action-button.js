'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');

const SvgIcon = require('./svg-icon');

function AnnotationActionButton({
  className = '',
  icon,
  isDisabled,
  label,
  onClick,
}) {
  return (
    <button
      className={classnames('annotation-action-button', className)}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      title={label}
    >
      <SvgIcon name={icon} className="annotation-action-button__icon" />
    </button>
  );
}

AnnotationActionButton.propTypes = {
  className: propTypes.string,
  /** The name of the SVGIcon to render */
  icon: propTypes.string.isRequired,
  isDisabled: propTypes.bool.isRequired,
  label: propTypes.string.isRequired,
  onClick: propTypes.func.isRequired,
};

module.exports = AnnotationActionButton;
