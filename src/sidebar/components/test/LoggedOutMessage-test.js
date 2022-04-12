import { mount } from 'enzyme';

import LoggedOutMessage, { $imports } from '../LoggedOutMessage';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';

describe('LoggedOutMessage', () => {
  let fakeStore;

  const createLoggedOutMessage = props => {
    return mount(<LoggedOutMessage onLogin={sinon.stub()} {...props} />);
  };

  beforeEach(() => {
    fakeStore = {
      getLink: sinon.stub().returns('signup_link'),
    };

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should link to signup', () => {
    const wrapper = createLoggedOutMessage();

    const signupLink = wrapper.find('Link').at(0);

    assert.calledWith(fakeStore.getLink, 'signup');
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
