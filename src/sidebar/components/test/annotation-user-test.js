import { mount } from 'enzyme';
import { createElement } from 'preact';

import AnnotationUser from '../annotation-user';
import { $imports } from '../annotation-user';

import { checkAccessibility } from '../../../test-util/accessibility';
import mockImportedComponents from '../../../test-util/mock-imported-components';

describe('AnnotationUser', () => {
  let fakeAnnotation;
  let fakeFeatures;
  let fakeIsThirdPartyUser;
  let fakeServiceUrl;
  let fakeSettings;
  let fakeUsername;

  const createAnnotationUser = () => {
    return mount(
      <AnnotationUser
        annotation={fakeAnnotation}
        features={fakeFeatures}
        serviceUrl={fakeServiceUrl}
        settings={fakeSettings}
      />
    );
  };

  beforeEach(() => {
    fakeAnnotation = {
      user: 'someone@hypothes.is',
    };
    fakeFeatures = { flagEnabled: sinon.stub() };
    fakeIsThirdPartyUser = sinon.stub().returns(false);
    fakeServiceUrl = sinon.stub();
    fakeSettings = {};
    fakeUsername = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../util/account-id': {
        isThirdPartyUser: fakeIsThirdPartyUser,
        username: fakeUsername,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  describe('link to user activity', () => {
    context('first-party user', () => {
      it('should provide a link to the user profile', () => {
        fakeIsThirdPartyUser.returns(false);
        fakeServiceUrl.returns('link-to-user');

        const wrapper = createAnnotationUser();
        const linkEl = wrapper.find('a');

        assert.isOk(linkEl.exists());
        assert.calledWith(fakeServiceUrl, 'user', {
          user: fakeAnnotation.user,
        });
        assert.equal(linkEl.prop('href'), 'link-to-user');
      });
    });

    context('third-party user', () => {
      beforeEach(() => {
        fakeIsThirdPartyUser.returns(true);
      });

      it('should link to user if `settings.usernameUrl` is set', () => {
        fakeSettings.usernameUrl = 'http://example.com?user=';
        fakeUsername.returns('elephant');

        const wrapper = createAnnotationUser();
        const linkEl = wrapper.find('a');

        assert.isOk(linkEl.exists());
        assert.equal(linkEl.prop('href'), 'http://example.com?user=elephant');
      });

      it('should not link to user if `settings.usernameUrl` is not set', () => {
        const wrapper = createAnnotationUser();
        const linkEl = wrapper.find('a');

        assert.isNotOk(linkEl.exists());
      });
    });
  });

  describe('rendered user name', () => {
    context('feature flag on', () => {
      beforeEach(() => {
        fakeFeatures.flagEnabled.withArgs('client_display_names').returns(true);
      });
      it('should render a display name when feature flag on and info available', () => {
        fakeAnnotation.user_info = {
          display_name: 'Maple Oaks',
        };

        const wrapper = createAnnotationUser();
        const linkEl = wrapper.find('a');

        assert.equal(linkEl.text(), 'Maple Oaks');
      });

      it('should render a username when feature flag on but info not present', () => {
        fakeUsername.returns('myusername');

        const wrapper = createAnnotationUser();
        const linkEl = wrapper.find('a');

        assert.equal(linkEl.text(), 'myusername');
      });
    });

    context('feature flag off', () => {
      it('should render a username for first-party users when feature flag off', () => {
        fakeFeatures.flagEnabled.returns(false);
        fakeUsername.returns('myusername');
        fakeAnnotation.user_info = {
          display_name: 'Maple Oaks',
        };

        const wrapper = createAnnotationUser();
        const linkEl = wrapper.find('a');

        assert.equal(linkEl.text(), 'myusername');
      });

      it('should render a display name for third-party users', () => {
        fakeAnnotation.user_info = {
          display_name: 'Maple Oaks',
        };
        fakeIsThirdPartyUser.returns(true);
        fakeFeatures.flagEnabled.returns(false);

        const wrapper = createAnnotationUser();

        assert.equal(wrapper.text(), 'Maple Oaks');
      });
    });
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createAnnotationUser(),
    })
  );
});
