'use strict';

const { shallow } = require('enzyme');
const { createElement } = require('preact');

const SidebarContentError = require('../sidebar-content-error');

describe('SidebarContentError', () => {
  const createSidebarContentError = (
    loggedOutErrorMessage,
    loggedInErrorMessage,
    isLoggedIn
  ) => {
    return shallow(
      <SidebarContentError
        loggedOutErrorMessage={loggedOutErrorMessage}
        loggedInErrorMessage={loggedInErrorMessage}
        onLoginRequest={sinon.stub()}
        isLoggedIn={isLoggedIn}
      />
    );
  };

  it('shows error you may need to login to view message when logged out', () => {
    const isLoggedIn = false;
    const loggedOutErrorMessage = 'This annotation is not available.';
    const loggedInErrorMessage =
      'You do not have permission to view this annotation.';

    const wrapper = createSidebarContentError(
      loggedOutErrorMessage,
      loggedInErrorMessage,
      isLoggedIn
    );

    const errorText = wrapper
      .find('p')
      .first()
      .text();
    assert.equal(
      errorText,
      loggedOutErrorMessage + 'You may need to log in to see it.'
    );
  });

  it('shows detailed error message when logged in', () => {
    const isLoggedIn = true;
    const loggedOutErrorMessage = 'This annotation is not available.';
    const loggedInErrorMessage =
      'You do not have permission to view this annotation.';

    const wrapper = createSidebarContentError(
      loggedOutErrorMessage,
      loggedInErrorMessage,
      isLoggedIn
    );

    const errorText = wrapper
      .find('p')
      .first()
      .text();

    assert.equal(errorText, loggedInErrorMessage);
  });
});
