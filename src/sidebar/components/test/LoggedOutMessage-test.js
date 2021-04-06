import { mount } from 'enzyme';

import LoggedOutMessage from '../LoggedOutMessage';
import { $imports } from '../LoggedOutMessage';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

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

    const signupLink = wrapper.find('.LoggedOutMessage__link').at(0);

    assert.calledWith(fakeServiceUrl, 'signup');
    assert.equal(signupLink.prop('href'), 'signup_link');
  });

  it('should have a login click handler', () => {
    const fakeOnLogin = sinon.stub();
    const wrapper = createLoggedOutMessage({ onLogin: fakeOnLogin });

    const loginLink = wrapper.find('LinkButton');

    assert.equal(loginLink.prop('onClick'), fakeOnLogin);
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createLoggedOutMessage(),
    })
  );
});
