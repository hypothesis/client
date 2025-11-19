import {
  checkAccessibility,
  mockImportedComponents,
} from '@hypothesis/frontend-testing';
import { mount } from '@hypothesis/frontend-testing';
import sinon from 'sinon';

import LoginPromptPanel, { $imports } from '../LoginPromptPanel';

describe('LoginPromptPanel', () => {
  let fakeOnLogin;
  let fakeOnSignUp;

  let fakeStore;
  let fakeSettings;

  function createComponent(props) {
    return mount(
      <LoginPromptPanel
        onLogin={fakeOnLogin}
        onSignUp={fakeOnSignUp}
        settings={fakeSettings}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    fakeStore = {
      isLoggedIn: sinon.stub().returns(false),
    };
    fakeSettings = { commentsMode: false };

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

  it.each([
    { commentsMode: true, expectedText: 'Please log in to write a comment.' },
    {
      commentsMode: false,
      expectedText: 'Please log in to create annotations or highlights.',
    },
  ])(
    'shows different text for comments mode',
    ({ commentsMode, expectedText }) => {
      fakeSettings.commentsMode = commentsMode;
      const wrapper = createComponent();

      assert.equal(
        wrapper.find('[data-testid="main-text"]').text(),
        expectedText,
      );
    },
  );

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createComponent(),
    }),
  );
});
