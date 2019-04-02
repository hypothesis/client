'use strict';

const classnames = require('classnames');
const propTypes = require('prop-types');
const { createElement } = require('preact');

function AnnotationActionButton({ icon, isDisabled, label, onClick }) {
  return (
    <button
      className="btn btn-clean annotation-action-btn"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      h-tooltip
    >
      <i className={classnames(icon, 'btn-icon')} />
    </button>
  );
}

AnnotationActionButton.propTypes = {
  /** A CSS classname corresponding to an `h` icon */
  icon: propTypes.string.isRequired,
  isDisabled: propTypes.bool.isRequired,
  label: propTypes.string.isRequired,
  onClick: propTypes.func.isRequired,
};

module.exports = AnnotationActionButton;
