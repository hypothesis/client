const { createElement } = require('preact');
const { mount } = require('enzyme');

const LoggedOutMessage = require('../logged-out-message');
const { $imports } = require('../logged-out-message');
const mockImportedComponents = require('./mock-imported-components');

describe('LoggedOutMessage', () => {
  const createLoggedOutMessage = props => {
    return mount(
      <LoggedOutMessage
        onLogin={sinon.stub()}
        serviceUrl={sinon.stub()}
        {...props}
      />
    );
  };

  beforeEach(() => {
    $imports.$mock(mockImportedComponents());
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should link to signup', () => {
    const fakeServiceUrl = sinon.stub().returns('signup_link');
    const wrapper = createLoggedOutMessage({ serviceUrl: fakeServiceUrl });

    const signupLink = wrapper.find('.logged-out-message__link').at(0);

    assert.calledWith(fakeServiceUrl, 'signup');
    assert.equal(signupLink.prop('href'), 'signup_link');
  });

  it('should have a login click handler', () => {
    const fakeOnLogin = sinon.stub();
    const wrapper = createLoggedOutMessage({ onLogin: fakeOnLogin });

    const loginLink = wrapper.find('.logged-out-message__link').at(1);

    assert.equal(loginLink.prop('onClick'), fakeOnLogin);
  });
});
