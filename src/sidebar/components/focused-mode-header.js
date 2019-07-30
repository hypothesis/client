'use strict';

const { createElement } = require('preact');
const propTypes = require('prop-types');

const { withServices } = require('../util/service-context');

function FocusedModeHeader({ settings }) {

  return (
    <div className="focused-mode-header">
      Showing annotations by{' '}
      <span className="focused-mode-header__user">{settings.focusedUser}</span>
    </div>
  );
}
FocusedModeHeader.propTypes = {
  // Injected services.
  settings: propTypes.object.isRequired,
};

FocusedModeHeader.injectedProps = ['settings'];

module.exports = withServices(FocusedModeHeader);
