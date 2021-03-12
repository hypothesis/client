import { mount } from 'enzyme';

import { checkAccessibility } from '../../../../test-util/accessibility';
import mockImportedComponents from '../../../../test-util/mock-imported-components';

import AnnotationUser, { $imports } from '../AnnotationUser';

describe('AnnotationUser', () => {
  let fakeAnnotation;
  let fakeAnnotationUser;
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
    fakeAnnotationUser = {
      annotationDisplayName: sinon
        .stub()
        .callsFake(annotation => annotation.user),
    };
    fakeFeatures = { flagEnabled: sinon.stub() };
    fakeIsThirdPartyUser = sinon.stub().returns(false);
    fakeServiceUrl = sinon.stub();
    fakeSettings = {};
    fakeUsername = sinon.stub();

    $imports.$mock(mockImportedComponents());
    $imports.$mock({
      '../../helpers/account-id': {
        isThirdPartyUser: fakeIsThirdPartyUser,
        username: fakeUsername,
      },
      '../../helpers/annotation-user': fakeAnnotationUser,
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

  it('renders the annotation author name', () => {
    fakeFeatures.flagEnabled.withArgs('client_display_names').returns(true);

    createAnnotationUser();

    assert.calledWith(
      fakeAnnotationUser.annotationDisplayName,
      fakeAnnotation,
      false,
      true
    );
  });

  it(
    'should pass a11y checks',
    checkAccessibility({
      content: () => createAnnotationUser(),
    })
  );
});
