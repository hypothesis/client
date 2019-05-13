'use strict';

const { Fragment, createElement } = require('preact');
const propTypes = require('prop-types');

/**
 * An error message to display in the sidebar.
 */
function SidebarContentError({
  loggedOutErrorMessage,
  loggedInErrorMessage,
  onLoginRequest,
  isLoggedIn,
}) {
  return (
    <div className="annotation-unavailable-message">
      <div className="annotation-unavailable-message__icon" />
      <p className="annotation-unavailable-message__label">
        {!isLoggedIn ? (
          <Fragment>
            {loggedOutErrorMessage}
            <br />
            You may need to{' '}
            <a
              className="loggedout-message__link"
              href=""
              onClick={onLoginRequest}
            >
              log in
            </a>{' '}
            to see it.
          </Fragment>
        ) : (
          <span>{loggedInErrorMessage}</span>
        )}
      </p>
    </div>
  );
}

SidebarContentError.propTypes = {
  /* A short error message to be displayed when logged out along with a login prompt. */
  loggedOutErrorMessage: propTypes.string,
  /* A detailed error message explaining why the error message happened when logged in. */
  loggedInErrorMessage: propTypes.string,
  /* A function that will launch the login flow for the user. */
  onLoginRequest: propTypes.func.isRequired,
  /* A boolean indicating whether the user is logged in or not. */
  isLoggedIn: propTypes.bool,
};

module.exports = SidebarContentError;
