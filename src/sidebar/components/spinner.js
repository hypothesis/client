'use strict';

const { createElement } = require('preact');

/**
 * Loading indicator.
 */
function Spinner() {
  // The `spinner__container` div only exists to center the spinner within
  // the `<spinner>` Angular component element. Once consumers of this component
  // have been converted to Preact, we should be able to remove this.
  return (
    <div className="spinner__container">
      <span className="spinner">
        <span>
          <span />
        </span>
      </span>
    </div>
  );
}

Spinner.propTypes = {};

module.exports = Spinner;
