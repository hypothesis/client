import { mount } from 'enzyme';

import { checkAccessibility } from '../../../test-util/accessibility';
import { mockImportedComponents } from '../../../test-util/mock-imported-components';
import LoginPromptPanel, { $imports } from '../LoginPromptPanel';

describe('LoginPromptPanel', () => {
  let fakeOnLogin;
  let fakeOnSignUp;

  let fakeStore;

  function createComponent(props) {
    return mount(
      <LoginPromptPanel
        onLogin={fakeOnLogin}
        onSignUp={fakeOnSignUp}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeStore = {
      isLoggedIn: sinon.stub().returns(false),
    };

    fakeOnLogin = sinon.stub();
    fakeOnSignUp = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../store': { useSidebarStore: () => fakeStore },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('should render if user not logged in', () => {
    fakeStore.isLoggedIn.returns(false);
    const wrapper = createComponent();

    assert.isTrue(wrapper.find('SidebarPanel').exists());
  });

  it('should not render if user is logged in', () => {
    fakeStore.isLoggedIn.returns(true);
    const wrapper = createComponent();

    assert.isFalse(wrapper.find('SidebarPanel').exists());
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
