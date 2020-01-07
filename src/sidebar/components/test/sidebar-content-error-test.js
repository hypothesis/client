import { mount } from 'enzyme';
import { createElement } from 'preact';

import SidebarContentError from '../sidebar-content-error';
import mockImportedComponents from './mock-imported-components';

describe('SidebarContentError', () => {
  const createSidebarContentError = (
    loggedOutErrorMessage,
    loggedInErrorMessage,
    isLoggedIn
  ) => {
    return mount(
      <SidebarContentError
        loggedOutErrorMessage={loggedOutErrorMessage}
        loggedInErrorMessage={loggedInErrorMessage}
        onLoginRequest={sinon.stub()}
        isLoggedIn={isLoggedIn}
      />
    );
  };

  beforeEach(() => {
    SidebarContentError.$imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    SidebarContentError.$imports.$restore();
  });

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
